// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com';

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

// Listener TYLKO dla wiadomości autoryzacyjnych z callback.js
window.addEventListener('message', async (event) => {
    console.log('MAIN.JS - AUTH RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type');

    const t = trelloGlobalContext || window.TrelloPowerUp.iframe();
    if (!t) {
        console.error("MAIN.JS: Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości autoryzacji.");
        return;
    }
    if (!trelloGlobalContext) trelloGlobalContext = t;

    const { type, accessToken, accessTokenSecret } = event.data || {};

    if (event.origin !== KAMAN_APP_ORIGIN) {
        if (event.origin === TRELLO_ORIGIN && type === 'bulk') {
            console.log('MAIN.JS: Ignorowanie wiadomości "bulk" z Trello.com w listenerze auth.');
        } else {
            console.warn('MAIN.JS: Wiadomość autoryzacji z nieoczekiwanego źródła odrzucona:', event.origin);
        }
        return;
    }

    if (type === 'TRELLO_AUTH_SUCCESS' && accessToken && accessTokenSecret) {
        console.log('MAIN.JS: Przetwarzanie TRELLO_AUTH_SUCCESS.');
        try {
            await t.store('member', 'private', 'authToken', accessToken);
            await t.store('member', 'private', 'authTokenSecret', accessTokenSecret);
            console.log('MAIN.JS: Tokeny Trello zapisane w storage.');
            t.alert({ message: 'Autoryzacja Trello zakończona pomyślnie!', duration: 3, display: 'success' });
        } catch (storeError) {
            console.error('MAIN.JS: Błąd podczas zapisywania tokenów Trello:', storeError);
            t.alert({ message: 'Nie udało się zapisać tokenów autoryzacyjnych.', duration: 5, display: 'error' });
        }
    } else if (type) {
        console.log('MAIN.JS: Otrzymano inną znaną wiadomość z KAMAN_APP_ORIGIN w listenerze auth:', event.data);
    }
});
console.log('MAIN.JS: Listener wiadomości autoryzacyjnych dodany.');

async function handleSavePdfData(t_context, pdfData) {
    // ... (ta funkcja pozostaje taka sama jak w poprzedniej odpowiedzi, z dokładnym logowaniem)
    console.log('MAIN.JS - handleSavePdfData: Rozpoczęto z danymi:', pdfData);
    const { pdfDataUrl, pdfName, cardId } = pdfData;

    if (!pdfDataUrl || !pdfName || !cardId) {
        console.error('MAIN.JS - handleSavePdfData: Brak kompletnych danych PDF do zapisu.');
        t_context.alert({message: 'Brak kompletnych danych PDF do zapisu.', duration: 5, display: 'error'});
        return;
    }

    try {
        const storedToken = await t_context.get('member', 'private', 'authToken');
        const storedTokenSecret = await t_context.get('member', 'private', 'authTokenSecret');

        if (!storedToken || !storedTokenSecret) {
            console.log('MAIN.JS - handleSavePdfData: Brak tokenów. Wymagana autoryzacja.');
            t_context.alert({
                message: 'Brak autoryzacji. Użyj opcji "Autoryzuj Kaman Oferty", aby się zalogować.',
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

        const responseText = await response.text(); // Odczytaj odpowiedź jako tekst

        if (response.ok) {
            const result = JSON.parse(responseText); // Parsuj JSON dopiero jeśli response.ok
            console.log('MAIN.JS - handleSavePdfData: SUKCES - Plik zapisany w Trello:', result);
            t_context.alert({ message: 'Oferta PDF została pomyślnie zapisana w Trello!', duration: 5, display: 'success' });
        } else {
            console.error('MAIN.JS - handleSavePdfData: BŁĄD - Nie udało się zapisać pliku do Trello:', response.status, responseText);
            t_context.alert({ message: `Błąd zapisu do Trello: ${responseText}`, duration: 10, display: 'error' });
        }
    } catch (error) {
        console.error('MAIN.JS - handleSavePdfData: BŁĄD - Wyjątek podczas wywoływania /api/saveToTrello:', error);
        t_context.alert({ message: `Krytyczny błąd podczas zapisu do Trello: ${error.message}`, duration: 10, display: 'error' });
    }
}

TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        console.log('MAIN.JS: Wywołano `board-buttons` capability. Zwracanie pustej tablicy, jeśli nieużywane.');
        trelloGlobalContext = t; // Zapisz kontekst, jeśli Trello go tu dostarcza
        return []; // Jeśli nie używasz przycisków tablicy, zwróć pustą tablicę
    },
    'card-buttons': function(t, options) {
        console.log('MAIN.JS: Inicjalizacja card-buttons.');
        trelloGlobalContext = t;
        return [{
            icon: KAMAN_APP_URL + 'vite.svg',
            text: 'Generuj ofertę Kaman',
            callback: function(t_button_context) {
                trelloGlobalContext = t_button_context;
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                return t_button_context.card('id')
                    .then(function(card) {
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url, 'i args:', { cardId: cardId });
                        return t_button_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750,
                            args: { cardId: cardId }
                        });
                    })
                    .then(function(popupReturnData) {
                        console.log('MAIN.JS - card-buttons .then(): Promise z popupu rozwiązany. Dane:', popupReturnData);
                        if (popupReturnData && popupReturnData.type === 'TRELLO_SAVE_PDF') {
                            console.log('MAIN.JS: Dane typu TRELLO_SAVE_PDF otrzymane z zamknięcia popupu React:', popupReturnData);
                            return handleSavePdfData(t_button_context, popupReturnData);
                        } else if (popupReturnData) {
                            console.log('MAIN.JS: Popup React zamknięty z innymi danymi lub bez określonego typu:', popupReturnData);
                        } else {
                            console.log('MAIN.JS: Popup React zamknięty bez zwrócenia danych (np. przez użytkownika klikającego X).');
                        }
                    })
                    .catch(function(error) {
                        console.error('MAIN.JS: Błąd w callbacku "Generuj ofertę Kaman" lub podczas obsługi zamknięcia popupu:', error);
                        (trelloGlobalContext || t_button_context).alert({
                            message: `Błąd operacji: ${error.message || error}`,
                            duration: 6, display: 'error'
                        });
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
                return { authorized: false };
            });
    },
    'show-authorization': function(t, options){
        console.log('MAIN.JS: show-authorization wywołane.');
        trelloGlobalContext = t;
        return t.popup({
            title: 'Autoryzacja Kaman Oferty',
            url: `${KAMAN_APP_URL}api/trelloAuth/start`,
            height: 680,
            width: 580,
        });
    }
}, {
    appName: 'Kaman Oferty Power-Up'
});
console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');