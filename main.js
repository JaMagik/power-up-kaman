// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/'; // Twój URL aplikacji Vercel
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com'; // Standardowy origin Trello

let trelloGlobalContext = null; // Przechowuje 't' dla globalnego użytku, np. w listenerze wiadomości

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

// Listener TYLKO dla wiadomości autoryzacyjnych z callback.js
window.addEventListener('message', async (event) => {
    // Logowanie każdej wiadomości, która dociera do tego listenera
    console.log('MAIN.JS - AUTH RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type', 'Full data:', event.data);

    const t = trelloGlobalContext || window.TrelloPowerUp.iframe();
    if (!t) {
        console.error("MAIN.JS: Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości autoryzacji.");
        return;
    }
    if (!trelloGlobalContext) trelloGlobalContext = t; // Ustaw, jeśli jeszcze nie jest

    const { type, accessToken, accessTokenSecret } = event.data || {};

    // Akceptuj tylko wiadomości od naszego origin dla autoryzacji
    if (event.origin !== KAMAN_APP_ORIGIN) {
        if (event.origin === TRELLO_ORIGIN && type === 'bulk') {
            console.log('MAIN.JS: Ignorowanie wiadomości "bulk" z Trello.com w listenerze auth.');
        } else if (event.origin) { // Loguj tylko jeśli origin jest zdefiniowany i nie jest KAMAN_APP_ORIGIN
            console.warn('MAIN.JS: Wiadomość autoryzacji z nieoczekiwanego źródła odrzucona:', event.origin, 'Dane:', event.data);
        }
        // Jeśli event.origin jest null (co może się zdarzyć), nie odrzucaj od razu,
        // ale polegaj na typie wiadomości, jeśli jest to krytyczne.
        // Jednak dla bezpieczeństwa, wiadomości z tokenami powinny mieć sprawdzony origin.
        // Dla tego konkretnego przypadku, jeśli origin nie jest KAMAN_APP_ORIGIN, odrzucamy.
        if (event.origin !== KAMAN_APP_ORIGIN) return;
    }

    if (type === 'TRELLO_AUTH_SUCCESS' && accessToken && accessTokenSecret) {
        console.log('MAIN.JS: Przetwarzanie TRELLO_AUTH_SUCCESS (origin zweryfikowany).');
        try {
            await t.store('member', 'private', 'authToken', accessToken);
            await t.store('member', 'private', 'authTokenSecret', accessTokenSecret);
            console.log('MAIN.JS: Tokeny Trello zapisane w storage.');
            t.alert({ message: 'Autoryzacja Trello zakończona pomyślnie!', duration: 3, display: 'success' });
        } catch (storeError) {
            console.error('MAIN.JS: Błąd podczas zapisywania tokenów Trello:', storeError);
            t.alert({ message: 'Nie udało się zapisać tokenów autoryzacyjnych.', duration: 5, display: 'error' });
        }
    } else if (type && event.origin === KAMAN_APP_ORIGIN) { // Inne typy wiadomości z naszego origina
        console.log('MAIN.JS: Otrzymano inną wiadomość z KAMAN_APP_ORIGIN w listenerze auth (może być z innego użycia postMessage):', event.data);
    }
});
console.log('MAIN.JS: Listener wiadomości autoryzacyjnych dodany.');

// Funkcja pomocnicza do zapisu PDF, wywoływana po zamknięciu popupa React
async function handleSavePdfData(t_context, pdfData) {
    console.log('MAIN.JS - handleSavePdfData: Rozpoczęto. Otrzymane dane PDF:', pdfData);
    const { pdfDataUrl, pdfName, cardId } = pdfData;

    if (!t_context) {
        console.error('MAIN.JS - handleSavePdfData: Brak kontekstu Trello (t_context).');
        // Spróbuj uzyskać nowy kontekst, jeśli to możliwe, ale to nie powinno być potrzebne
        // const fallbackT = window.TrelloPowerUp.iframe();
        // if (fallbackT && fallbackT.alert) fallbackT.alert({message: 'Błąd wewnętrzny: Brak kontekstu Trello.', duration: 5, display: 'error'});
        return;
    }

    if (!pdfDataUrl || !pdfName || !cardId) {
        console.error('MAIN.JS - handleSavePdfData: Brak kompletnych danych PDF do zapisu.', pdfData);
        t_context.alert({message: 'Brak kompletnych danych PDF do zapisu. Spróbuj ponownie.', duration: 5, display: 'error'});
        return;
    }

    try {
        console.log('MAIN.JS - handleSavePdfData: Pobieranie tokenów...');
        const storedToken = await t_context.get('member', 'private', 'authToken');
        const storedTokenSecret = await t_context.get('member', 'private', 'authTokenSecret');

        if (!storedToken || !storedTokenSecret) {
            console.log('MAIN.JS - handleSavePdfData: Brak tokenów autoryzacyjnych. Proszę najpierw autoryzować Power-Up.');
            t_context.alert({
                message: 'Brak autoryzacji. Użyj opcji "Autoryzuj Kaman Oferty" (w menu Power-Upa na karcie), aby się zalogować.',
                duration: 8,
                display: 'error'
            });
            return;
        }

        console.log('MAIN.JS - handleSavePdfData: Tokeny znalezione. Próba zapisu do Trello. CardId:', cardId);
        const saveApiUrl = `${KAMAN_APP_URL}api/saveToTrello`;
        console.log('MAIN.JS - handleSavePdfData: Wywoływanie API zapisu:', saveApiUrl);

        const response = await fetch(saveApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardId: cardId,
                accessToken: storedToken,
                accessTokenSecret: storedTokenSecret,
                fileDataUrl: pdfDataUrl,
                fileName: pdfName
            })
        });

        const responseText = await response.text(); // Zawsze odczytuj odpowiedź jako tekst

        if (response.ok) {
            const result = JSON.parse(responseText); // Parsuj JSON tylko jeśli odpowiedź jest OK
            console.log('MAIN.JS - handleSavePdfData: SUKCES - Plik zapisany w Trello:', result);
            t_context.alert({ message: 'Oferta PDF została pomyślnie zapisana w Trello!', duration: 5, display: 'success' });
            // Popup React został już zamknięty przez t.closePopup(dataToReturn) w UnifiedOfferForm.jsx
        } else {
            console.error('MAIN.JS - handleSavePdfData: BŁĄD - Nie udało się zapisać pliku do Trello:', response.status, responseText);
            t_context.alert({ message: `Błąd zapisu do Trello: ${responseText || response.statusText}`, duration: 10, display: 'error' });
        }
    } catch (error) {
        console.error('MAIN.JS - handleSavePdfData: BŁĄD - Wyjątek podczas wywoływania /api/saveToTrello lub innej operacji:', error);
        t_context.alert({ message: `Krytyczny błąd podczas zapisu do Trello: ${error.message}`, duration: 10, display: 'error' });
    }
}

TrelloPowerUp.initialize({
    // Dodano pustą definicję, aby uniknąć błędu "unsupported command: board-buttons"
    'board-buttons': function(t, options) {
        console.log('MAIN.JS: Wywołano `board-buttons` capability. Zwracanie pustej tablicy.');
        trelloGlobalContext = t; // Zapisz kontekst, jeśli Trello go tu dostarcza
        return []; // Jeśli nie używasz przycisków tablicy, zwróć pustą tablicę
    },
    'card-buttons': function(t, options) {
        console.log('MAIN.JS: Inicjalizacja card-buttons.');
        trelloGlobalContext = t; // Zapisz 't' dla listenera wiadomości autoryzacji
        return [{
            icon: KAMAN_APP_URL + 'vite.svg', // Upewnij się, że vite.svg jest w public/ Twojej aplikacji Vercel
            text: 'Generuj ofertę Kaman',
            callback: function(t_button_context) {
                trelloGlobalContext = t_button_context; // Aktualizuj, to jest 't' dla tej konkretnej operacji
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                return t_button_context.card('id')
                    .then(function(card) {
                        if (!card || !card.id) {
                            console.error('MAIN.JS: Nie udało się pobrać ID karty.');
                            t_button_context.alert({message: 'Nie udało się pobrać ID karty.', duration: 5, display: 'error'});
                            throw new Error('Nie udało się pobrać ID karty.'); // Rzuć błąd, aby zatrzymać .then()
                        }
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url, 'i args:', { cardId: cardId });
                        return t_button_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750,
                            args: { cardId: cardId } // Przekazanie cardId do popupa przez args
                        });
                    })
                    .then(function(popupReturnData) {
                        console.log('MAIN.JS - card-buttons .then(): Promise z popupu rozwiązany. Otrzymane dane:', popupReturnData);
                        if (popupReturnData && typeof popupReturnData === 'object' && popupReturnData.type === 'TRELLO_SAVE_PDF') {
                            console.log('MAIN.JS: Dane typu TRELLO_SAVE_PDF otrzymane! Dane:', popupReturnData);
                            // Użyj t_button_context, który jest 't' z momentu kliknięcia przycisku na karcie
                            return handleSavePdfData(t_button_context, popupReturnData);
                        } else if (popupReturnData) {
                            console.warn('MAIN.JS: Popup React zamknięty, ale zwrócone dane nie są typu TRELLO_SAVE_PDF lub są niekompletne. Otrzymano:', popupReturnData);
                            if (t_button_context && t_button_context.alert) {
                                // t_button_context.alert({ message: 'Otrzymano nieoczekiwane dane z okna generowania oferty.', duration: 5, display: 'warning' });
                            }
                        } else {
                            console.log('MAIN.JS: Popup React zamknięty bez zwrócenia danych (np. przez użytkownika klikającego X lub Esc).');
                        }
                    })
                    .catch(function(error) {
                        console.error('MAIN.JS: Błąd w łańcuchu promise dla t.popup() (card-buttons):', error);
                        if (t_button_context && t_button_context.alert) {
                            t_button_context.alert({
                                message: `Wystąpił błąd systemowy Power-Upa: ${error.message || 'Nieznany błąd'}`,
                                duration: 7, display: 'error'
                            });
                        }
                    });
            }
        }];
    },
    'authorization-status': function(t, options){
        console.log('MAIN.JS: Sprawdzanie statusu autoryzacji.');
        trelloGlobalContext = t;
        return t.get('member', 'private', 'authToken')
            .then(function(authToken){
                if(authToken){
                    console.log('MAIN.JS: Status autoryzacji: Zalogowany.');
                    return { authorized: true };
                }
                console.log('MAIN.JS: Status autoryzacji: Niezalogowany.');
                return { authorized: false };
            })
            .catch(err => {
                console.error("MAIN.JS: Błąd sprawdzania statusu autoryzacji:", err);
                return { authorized: false }; // W razie błędu, przyjmij brak autoryzacji
            });
    },
    'show-authorization': function(t, options){
        console.log('MAIN.JS: show-authorization wywołane.');
        trelloGlobalContext = t;
        // Ten popup otworzy Twoją stronę /api/trelloAuth/start,
        // która przekieruje do Trello, a Trello wywoła /api/trelloAuth/callback.
        // Callback następnie wyśle postMessage z tokenami do tego okna (main.js).
        return t.popup({
            title: 'Autoryzacja Kaman Oferty',
            url: `${KAMAN_APP_URL}api/trelloAuth/start`,
            height: 680,
            width: 580,
        });
    }
}, {
    appName: 'Kaman Oferty Power-Up' // Zgodnie z Twoim kodem
});
console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');