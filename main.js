// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;

let trelloGlobalContext = null; // Przechowuje 't' dla globalnego użytku

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    if (event.origin !== KAMAN_APP_ORIGIN) {
        console.warn('Wiadomość z nieoczekiwanego źródła:', event.origin, 'Oczekiwano:', KAMAN_APP_ORIGIN);
        return;
    }

    const { type, pdfDataUrl, pdfName, cardId, accessToken, accessTokenSecret } = event.data;
    const t = trelloGlobalContext || window.TrelloPowerUp.iframe();

    if (!t) {
        console.error("Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości.");
        return;
    }

    if (type === 'TRELLO_AUTH_SUCCESS' && accessToken && accessTokenSecret) {
        console.log('Otrzymano tokeny autoryzacyjne z callbacka.');
        try {
            await t.store('member', 'private', 'authToken', accessToken);
            await t.store('member', 'private', 'authTokenSecret', accessTokenSecret);
            console.log('Tokeny Trello zapisane w storage.');
            t.alert({ message: 'Autoryzacja Trello zakończona pomyślnie!', duration: 3, display: 'success' });
            // Zamknięcie okna auth jest obsługiwane przez callback.js
        } catch (storeError) {
            console.error('Błąd podczas zapisywania tokenów Trello:', storeError);
            t.alert({ message: 'Nie udało się zapisać tokenów autoryzacyjnych.', duration: 5, display: 'error' });
        }
    } else if (type === 'TRELLO_SAVE_PDF' && pdfDataUrl && pdfName && cardId) {
        console.log('Otrzymano żądanie zapisu PDF:', { pdfName, cardId });

        try {
            const storedToken = await t.get('member', 'private', 'authToken');
            const storedTokenSecret = await t.get('member', 'private', 'authTokenSecret');

            if (!storedToken || !storedTokenSecret) {
                t.alert({
                    message: 'Brak autoryzacji. Użyj opcji "Autoryzuj Kaman Oferty", aby się zalogować.',
                    duration: 7,
                    display: 'error'
                });
                return; // Nie kontynuuj, jeśli nie ma tokenów
            }

            console.log('Tokeny znalezione. Próba zapisu do Trello z cardId:', cardId);

            const response = await fetch(`${KAMAN_APP_URL}api/saveToTrello`, {
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

            if (response.ok) {
                const result = await response.json();
                console.log('SUKCES: Plik zapisany w Trello:', result);
                t.alert({ message: 'Oferta PDF została pomyślnie zapisana w Trello!', duration: 5, display: 'success' });
                t.closePopup(); // Zamknij popup Reacta z formularzem
            } else {
                const errorResult = await response.text();
                console.error('BŁĄD: Nie udało się zapisać pliku do Trello:', response.status, errorResult);
                t.alert({ message: `Błąd zapisu do Trello: ${errorResult}`, duration: 10, display: 'error' });
            }
        } catch (error) {
            console.error('BŁĄD: Wyjątek podczas wywoływania /api/saveToTrello:', error);
            t.alert({ message: `Krytyczny błąd podczas zapisu do Trello: ${error.message}`, duration: 10, display: 'error' });
        }
    } else {
        console.log('Otrzymano nieobsługiwaną wiadomość lub brak wymaganych danych:', event.data);
    }
});
console.log('Listener wiadomości dodany.');


TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
        trelloGlobalContext = t; // Zawsze aktualizuj globalny kontekst
        return [{
            icon: KAMAN_APP_URL + 'vite.svg', // Użyj publicznie dostępnej ikony, np. z Twojej domeny Vercel
            text: 'Generuj ofertę Kaman',
            callback: function(t_button_context) {
                trelloGlobalContext = t_button_context; // Ustaw kontekst dla tego wywołania
                console.log('Callback "Generuj ofertę Kaman" wywołany.');
                return t_button_context.card('id')
                    .then(function(card) {
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
                        console.log('Otwieranie popupu z URL:', url);
                        return t_button_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750, //
                            args: { cardId: cardId }
                        });
                    })
                    .catch(function(error) {
                        console.error('Błąd w callbacku "Generuj ofertę Kaman":', error);
                        (trelloGlobalContext || t_button_context).alert({
                            message: `Błąd otwierania popupu: ${error.message || error}`,
                            duration: 6, display: 'error'
                        });
                    });
            }
        }];
    },
    'authorization-status': function(t, options) {
        trelloGlobalContext = t;
        return t.get('member', 'private', 'authToken')
            .then(function(authToken) {
                if (authToken) {
                    console.log('Status autoryzacji: Zalogowany');
                    return { authorized: true };
                }
                console.log('Status autoryzacji: Niezalogowany');
                return { authorized: false };
            })
            .catch(err => {
                console.error("Błąd sprawdzania statusu autoryzacji:", err);
                return { authorized: false };
            });
    },
    'show-authorization': function(t, options) {
        trelloGlobalContext = t;
        console.log('show-authorization: Otwieranie popupu autoryzacji...');
        return t.popup({ // Użyj t.popup dla lepszej kontroli nad przepływem postMessage
            title: 'Autoryzacja Kaman Oferty',
            url: `${KAMAN_APP_URL}api/trelloAuth/start`,
            height: 680,
            width: 580,
        });
    }
}, {
    // appKey: 'TWOJ_KLUCZ_API_TRELLO_Z_MANIFESTU_LUB_HARDCODED', // Podaj, jeśli potrzebne
    appName: 'Kaman Oferty Power-Up' //
});
console.log('TrelloPowerUp.initialize zakończone.');