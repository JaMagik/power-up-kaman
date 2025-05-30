// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com';

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

// Listener TYLKO dla wiadomości autoryzacyjnych
window.addEventListener('message', async (event) => {
    console.log('MAIN.JS - AUTH RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type');

    const t = trelloGlobalContext || window.TrelloPowerUp.iframe();
    if (!t) {
        console.error("MAIN.JS: Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości autoryzacji.");
        return;
    }
    if (!trelloGlobalContext) trelloGlobalContext = t;

    const { type, accessToken, accessTokenSecret } = event.data || {};

    // Akceptuj tylko wiadomości od naszego origin dla autoryzacji
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


// Funkcja pomocnicza do zapisu PDF
async function handleSavePdfData(t_context, pdfData) {
    const { pdfDataUrl, pdfName, cardId } = pdfData;
    console.log('MAIN.JS: Rozpoczynanie handleSavePdfData dla cardId:', cardId);

    if (!pdfDataUrl || !pdfName || !cardId) {
        console.error('MAIN.JS: Brak kompletnych danych PDF do zapisu.');
        t_context.alert({message: 'Brak kompletnych danych PDF do zapisu.', duration: 5, display: 'error'});
        return;
    }

    try {
        const storedToken = await t_context.get('member', 'private', 'authToken');
        const storedTokenSecret = await t_context.get('member', 'private', 'authTokenSecret');

        if (!storedToken || !storedTokenSecret) {
            console.log('MAIN.JS: Brak tokenów przy próbie zapisu. Informowanie użytkownika.');
            t_context.alert({
                message: 'Brak autoryzacji. Użyj opcji "Autoryzuj Kaman Oferty" (w menu Power-Upa), aby się zalogować.',
                duration: 8,
                display: 'error'
            });
            return;
        }

        console.log('MAIN.JS: Tokeny znalezione. Próba zapisu do Trello z cardId:', cardId);
        const saveApiUrl = `${KAMAN_APP_URL}api/saveToTrello`;
        console.log('MAIN.JS: Wywoływanie API zapisu:', saveApiUrl);

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

        if (response.ok) {
            const result = await response.json();
            console.log('MAIN.JS: SUKCES - Plik zapisany w Trello:', result);
            t_context.alert({ message: 'Oferta PDF została pomyślnie zapisana w Trello!', duration: 5, display: 'success' });
            // Popup React został już zamknięty przez `t.closePopup(dataToReturn)` w UnifiedOfferForm.jsx
        } else {
            const errorResult = await response.text();
            console.error('MAIN.JS: BŁĄD - Nie udało się zapisać pliku do Trello:', response.status, errorResult);
            t_context.alert({ message: `Błąd zapisu do Trello: ${errorResult}`, duration: 10, display: 'error' });
        }
    } catch (error) {
        console.error('MAIN.JS: BŁĄD - Wyjątek podczas wywoływania /api/saveToTrello:', error);
        t_context.alert({ message: `Krytyczny błąd podczas zapisu do Trello: ${error.message}`, duration: 10, display: 'error' });
    }
}


TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
        console.log('MAIN.JS: Inicjalizacja card-buttons.');
        trelloGlobalContext = t; // Zapisz 't' dla listenera wiadomości autoryzacji
        return [{
            icon: KAMAN_APP_URL + 'vite.svg',
            text: 'Generuj ofertę Kaman',
            callback: function(t_button_context) {
                trelloGlobalContext = t_button_context; // Aktualizuj, to jest 't' dla tej konkretnej operacji
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                return t_button_context.card('id')
                    .then(function(card) {
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`; // Przekazanie cardId przez URL nadal może być przydatne jako fallback
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url);
                        return t_button_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750,
                            args: { cardId: cardId } // Główny sposób przekazania cardId do popupa
                        });
                    })
                    .then(function(popupReturnData) { // Obsługa danych zwróconych przez t.closePopup(data)
                        if (popupReturnData && popupReturnData.type === 'TRELLO_SAVE_PDF') {
                            console.log('MAIN.JS: Dane otrzymane z zamknięcia popupu React:', popupReturnData);
                            return handleSavePdfData(t_button_context, popupReturnData); // Użyj t_button_context
                        } else if (popupReturnData) {
                            console.log('MAIN.JS: Popup React zamknięty z innymi danymi lub bez określonego typu:', popupReturnData);
                        } else {
                            console.log('MAIN.JS: Popup React zamknięty bez zwrócenia danych.');
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
        // ... (bez zmian w stosunku do poprzedniej, poprawnej wersji)
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
        // ... (bez zmian w stosunku do poprzedniej, poprawnej wersji)
        console.log('MAIN.JS: show-authorization wywołane.');
        trelloGlobalContext = t;
        return t.popup({ // Ten popup jest dla autoryzacji, jego callback.js wyśle postMessage
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