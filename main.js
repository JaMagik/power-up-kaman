// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/'; // Twój URL aplikacji Vercel
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com';

let trelloGlobalContext = null; // Przechowuje 't' dla globalnego użytku

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    // Logowanie każdej wiadomości, która dociera do tego listenera
    console.log('MAIN.JS - RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type', 'Full data:', event.data);

    const t = trelloGlobalContext || window.TrelloPowerUp.iframe();
    if (!t) {
        console.error("MAIN.JS: Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości.");
        return;
    }
    if (!trelloGlobalContext) trelloGlobalContext = t; // Ustaw, jeśli jeszcze nie jest

    const { type, pdfDataUrl, pdfName, cardId, accessToken, accessTokenSecret } = event.data || {};

    // Sprawdzanie Origin - WAŻNE!
    // Wiadomości od Twojej aplikacji (popup i callback autoryzacji) powinny mieć KAMAN_APP_ORIGIN
    if (event.origin !== KAMAN_APP_ORIGIN) {
        if (event.origin === TRELLO_ORIGIN && type === 'bulk') {
            // Ignoruj wiadomości 'bulk' od Trello, są to wewnętrzne komunikaty
            console.log('MAIN.JS: Otrzymano wiadomość "bulk" z origin Trello.com, ignorowanie.');
        } else {
            console.warn('MAIN.JS: Wiadomość z nieoczekiwanego lub nieobsługiwanego źródła odrzucona:', event.origin, 'Dane:', event.data);
        }
        return; // Odrzuć wiadomości z nieznanych/niezaufanych źródeł
    }

    // Przetwarzanie tylko wiadomości z KAMAN_APP_ORIGIN
    if (type === 'TRELLO_AUTH_SUCCESS' && accessToken && accessTokenSecret) {
        console.log('MAIN.JS: Przetwarzanie TRELLO_AUTH_SUCCESS (origin zweryfikowany).');
        try {
            await t.store('member', 'private', 'authToken', accessToken);
            await t.store('member', 'private', 'authTokenSecret', accessTokenSecret);
            console.log('MAIN.JS: Tokeny Trello zapisane w storage.');
            t.alert({ message: 'Autoryzacja Trello zakończona pomyślnie!', duration: 3, display: 'success' });
            // Możesz chcieć odświeżyć stan lub zamknąć okno, które mogło to zainicjować
        } catch (storeError) {
            console.error('MAIN.JS: Błąd podczas zapisywania tokenów Trello:', storeError);
            t.alert({ message: 'Nie udało się zapisać tokenów autoryzacyjnych.', duration: 5, display: 'error' });
        }
    } else if (type === 'TRELLO_SAVE_PDF' && pdfDataUrl && pdfName && cardId) {
        console.log('MAIN.JS: Przetwarzanie TRELLO_SAVE_PDF (origin zweryfikowany):', { pdfName, cardId });
        try {
            const storedToken = await t.get('member', 'private', 'authToken');
            const storedTokenSecret = await t.get('member', 'private', 'authTokenSecret');

            if (!storedToken || !storedTokenSecret) {
                console.log('MAIN.JS: Brak tokenów przy próbie zapisu. Informowanie użytkownika.');
                t.alert({
                    message: 'Brak autoryzacji. Użyj opcji "Autoryzuj Kaman Oferty" (w menu Power-Upa), aby się zalogować.',
                    duration: 8,
                    display: 'error'
                });
                // Poinformuj React app, że zapis się nie powiódł z powodu braku autoryzacji
                // (jeśli React app ma na to nasłuchiwać)
                // UnifiedOfferForm.jsx powinien zresetować isSaving
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
                t.alert({ message: 'Oferta PDF została pomyślnie zapisana w Trello!', duration: 5, display: 'success' });
                t.closePopup(); // Zamknij popup Reacta (jeśli ten kontekst 't' go otworzył)
            } else {
                const errorResult = await response.text();
                console.error('MAIN.JS: BŁĄD - Nie udało się zapisać pliku do Trello:', response.status, errorResult);
                t.alert({ message: `Błąd zapisu do Trello: ${errorResult}`, duration: 10, display: 'error' });
            }
        } catch (error) {
            console.error('MAIN.JS: BŁĄD - Wyjątek podczas wywoływania /api/saveToTrello:', error);
            t.alert({ message: `Krytyczny błąd podczas zapisu do Trello: ${error.message}`, duration: 10, display: 'error' });
        }
    } else if (type) { // Jeśli typ jest, ale nie pasuje, a origin był KAMAN_APP_ORIGIN
        console.log('MAIN.JS: Otrzymano znaną, ale nieobsługiwaną wiadomość lub brak wymaganych danych z KAMAN_APP_ORIGIN:', event.data);
    }
});
console.log('MAIN.JS: Listener wiadomości dodany.');

TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
        console.log('MAIN.JS: Inicjalizacja card-buttons.');
        trelloGlobalContext = t;
        return [{
            icon: KAMAN_APP_URL + 'vite.svg', // Upewnij się, że vite.svg jest w public/ Twojej aplikacji
            text: 'Generuj ofertę Kaman',
            callback: function(t_button_context) {
                trelloGlobalContext = t_button_context;
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                return t_button_context.card('id')
                    .then(function(card) {
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url);
                        return t_button_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750,
                            args: { cardId: cardId }
                        });
                    })
                    .catch(function(error) {
                        console.error('MAIN.JS: Błąd w callbacku "Generuj ofertę Kaman":', error);
                        (trelloGlobalContext || t_button_context).alert({
                            message: `Błąd otwierania popupu: ${error.message || error}`,
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
            url: `${KAMAN_APP_URL}api/trelloAuth/start`, // Endpoint rozpoczynający OAuth
            height: 680,
            width: 580,
        });
    }
}, {
    appName: 'Kaman Oferty Power-Up'
});
console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');