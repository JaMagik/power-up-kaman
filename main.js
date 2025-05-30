// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com';

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    // !!!!! BARDZO OGÓLNY LOG NA SAMYM POCZĄTKU !!!!!
    console.log('MAIN.JS - RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type', 'Full data:', event.data);

    const { type, pdfDataUrl, pdfName, cardId, accessToken, accessTokenSecret } = event.data || {}; // Dodano || {} dla bezpieczeństwa
    const t = trelloGlobalContext || window.TrelloPowerUp.iframe();

    if (!t) {
        console.error("MAIN.JS: Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości.");
        return;
    }
    if (!trelloGlobalContext) trelloGlobalContext = t;

    // Dopiero teraz sprawdzanie origin
    let isOriginTrusted = false;
    if (type === 'TRELLO_AUTH_SUCCESS' && event.origin === KAMAN_APP_ORIGIN) {
        isOriginTrusted = true;
    } else if (type === 'TRELLO_SAVE_PDF' && event.origin === KAMAN_APP_ORIGIN) {
        isOriginTrusted = true;
    } else if (event.origin === KAMAN_APP_ORIGIN) {
        isOriginTrusted = true;
        console.warn('MAIN.JS: Wiadomość z KAMAN_APP_ORIGIN, ale o nieznanym typie lub niekompletna:', event.data);
    }

    if (!isOriginTrusted) {
        if (event.origin === TRELLO_ORIGIN) {
            // Wiadomości typu "bulk" z Trello są oczekiwane, można je zignorować lub obsłużyć jeśli potrzebne
            if (type === 'bulk') {
                console.log('MAIN.JS: Otrzymano wiadomość "bulk" z origin Trello.com, ignorowanie dla logiki aplikacji.', event.data);
            } else {
                console.log('MAIN.JS: Otrzymano inną wiadomość z origin Trello.com:', event.data);
            }
        } else if (event.origin) { // Jeśli origin jest inny niż KAMAN_APP_ORIGIN i TRELLO_ORIGIN
            console.warn('MAIN.JS: Wiadomość z nieoczekiwanego źródła odrzucona:', event.origin, 'Dane:', event.data);
        }
        // Jeśli event.origin jest null lub undefined, co może się zdarzyć w niektórych scenariuszach iframe,
        // ale postMessage zwykle ma ustawiony origin.
        return; // Zakończ przetwarzanie, jeśli origin nie jest zaufany dla oczekiwanych typów wiadomości
    }


    // Dalsze przetwarzanie tylko jeśli isOriginTrusted = true
    if (type === 'TRELLO_AUTH_SUCCESS' && accessToken && accessTokenSecret) {
        console.log('MAIN.JS: Przetwarzanie TRELLO_AUTH_SUCCESS (origin zweryfikowany).');
        // ... reszta logiki jak poprzednio ...
        try {
            await t.store('member', 'private', 'authToken', accessToken);
            await t.store('member', 'private', 'authTokenSecret', accessTokenSecret);
            console.log('MAIN.JS: Tokeny Trello zapisane w storage.');
            t.alert({ message: 'Autoryzacja Trello zakończona pomyślnie!', duration: 3, display: 'success' });
        } catch (storeError) {
            console.error('MAIN.JS: Błąd podczas zapisywania tokenów Trello:', storeError);
            t.alert({ message: 'Nie udało się zapisać tokenów autoryzacyjnych.', duration: 5, display: 'error' });
        }

    } else if (type === 'TRELLO_SAVE_PDF' && pdfDataUrl && pdfName && cardId) {
        console.log('MAIN.JS: Przetwarzanie TRELLO_SAVE_PDF (origin zweryfikowany):', { pdfName, cardId });
        // ... reszta logiki jak poprzednio ...
        try {
            const storedToken = await t.get('member', 'private', 'authToken');
            const storedTokenSecret = await t.get('member', 'private', 'authTokenSecret');

            if (!storedToken || !storedTokenSecret) {
                console.log('MAIN.JS: Brak tokenów przy próbie zapisu. Informowanie użytkownika.');
                t.alert({
                    message: 'Brak autoryzacji. Użyj opcji "Autoryzuj Kaman Oferty", aby się zalogować.',
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
                t.alert({ message: 'Oferta PDF została pomyślnie zapisana w Trello!', duration: 5, display: 'success' });
                t.closePopup();
            } else {
                const errorResult = await response.text();
                console.error('MAIN.JS: BŁĄD - Nie udało się zapisać pliku do Trello:', response.status, errorResult);
                t.alert({ message: `Błąd zapisu do Trello: ${errorResult}`, duration: 10, display: 'error' });
            }
        } catch (error) {
            console.error('MAIN.JS: BŁĄD - Wyjątek podczas wywoływania /api/saveToTrello:', error);
            t.alert({ message: `Krytyczny błąd podczas zapisu do Trello: ${error.message}`, duration: 10, display: 'error' });
        }

    } else if (type && isOriginTrusted) { // Jeśli typ jest, ale nie pasuje, a origin był KAMAN_APP_ORIGIN
        console.log('MAIN.JS: Otrzymano znaną, ale nieobsługiwaną wiadomość lub brak wymaganych danych:', event.data);
    }
});
console.log('MAIN.JS: Listener wiadomości dodany z bardzo ogólnym logiem na początku.');

// ... (reszta kodu TrelloPowerUp.initialize bez zmian, upewnij się, że `trelloGlobalContext = t;` jest ustawiane)
TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
        console.log('MAIN.JS: Inicjalizacja card-buttons. Kontekst t:', t);
        trelloGlobalContext = t;
        // ... reszta callbacku card-buttons
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
        console.log('MAIN.JS: Sprawdzanie statusu autoryzacji. Kontekst t:', t);
        trelloGlobalContext = t;
        // ... reszta callbacku authorization-status
        return t.get('member', 'private', 'authToken')
            .then(function(authToken){
                if(authToken){
                    console.log('MAIN.JS: Status autoryzacji: Zalogowany (token istnieje).');
                    return { authorized: true };
                }
                console.log('MAIN.JS: Status autoryzacji: Niezalogowany (brak tokenu).');
                return { authorized: false };
            })
            .catch(err => {
                console.error("MAIN.JS: Błąd sprawdzania statusu autoryzacji:", err);
                return { authorized: false };
            });
    },
    'show-authorization': function(t, options){
        console.log('MAIN.JS: show-authorization wywołane. Otwieranie popupu autoryzacji. Kontekst t:', t);
        trelloGlobalContext = t;
        // ... reszta callbacku show-authorization
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