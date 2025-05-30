// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    console.log('MAIN.JS: Odebrano wiadomość:', event.data ? event.data.type : 'brak typu', 'z origin:', event.origin);

    if (event.origin !== KAMAN_APP_ORIGIN) {
        console.warn('MAIN.JS: Wiadomość z nieoczekiwanego źródła odrzucona:', event.origin);
        return;
    }

    const { type, pdfDataUrl, pdfName, cardId, accessToken, accessTokenSecret } = event.data;
    const t = trelloGlobalContext || window.TrelloPowerUp.iframe(); // Spróbuj uzyskać kontekst 't'

    if (!t) {
        console.error("MAIN.JS: Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości.");
        // Możesz spróbować pokazać alert Trello, jeśli masz dostęp do jakiegoś 't'
        // lub zalogować błąd w bardziej widoczny sposób, jeśli to możliwe.
        return;
    }
    // Ustawienie globalnego kontekstu, jeśli jeszcze nie został ustawiony
    if (!trelloGlobalContext) trelloGlobalContext = t;


    if (type === 'TRELLO_AUTH_SUCCESS' && accessToken && accessTokenSecret) {
        console.log('MAIN.JS: Otrzymano tokeny autoryzacyjne z callbacka.');
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
        console.log('MAIN.JS: Otrzymano żądanie zapisu PDF:', { pdfName, cardId });

        try {
            const storedToken = await t.get('member', 'private', 'authToken');
            const storedTokenSecret = await t.get('member', 'private', 'authTokenSecret');

            if (!storedToken || !storedTokenSecret) {
                console.log('MAIN.JS: Brak tokenów. Informowanie użytkownika o konieczności autoryzacji.');
                t.alert({
                    message: 'Brak autoryzacji. Kliknij "Autoryzuj Kaman Oferty" (w menu Power-Upa lub ustawieniach karty), aby się zalogować.',
                    duration: 8, // Dłuższy czas wyświetlania
                    display: 'error'
                });
                // Sugerujemy użytkownikowi, aby użył `show-authorization`
                // Możesz też spróbować programowo wywołać `t.showCard()` lub inną akcję,
                // ale alert jest najprostszy.
                return;
            }

            console.log('MAIN.JS: Tokeny znalezione. Próba zapisu do Trello z cardId:', cardId);

            // Użyj pełnego URL do funkcji API na Vercel
            const saveApiUrl = `${KAMAN_APP_URL}api/saveToTrello`;
            console.log('MAIN.JS: Wywoływanie API zapisu:', saveApiUrl);

            const response = await fetch(saveApiUrl, { // Pełny URL do API
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
                t.closePopup(); // Zamknij popup Reacta z formularzem
            } else {
                const errorResult = await response.text();
                console.error('MAIN.JS: BŁĄD - Nie udało się zapisać pliku do Trello:', response.status, errorResult);
                t.alert({ message: `Błąd zapisu do Trello: ${errorResult}`, duration: 10, display: 'error' });
            }
        } catch (error) {
            console.error('MAIN.JS: BŁĄD - Wyjątek podczas wywoływania /api/saveToTrello:', error);
            t.alert({ message: `Krytyczny błąd podczas zapisu do Trello: ${error.message}`, duration: 10, display: 'error' });
        }
    } else {
        console.log('MAIN.JS: Otrzymano nieobsługiwaną wiadomość lub brak wymaganych danych:', event.data);
    }
});
console.log('MAIN.JS: Listener wiadomości dodany.');

TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
        console.log('MAIN.JS: Inicjalizacja card-buttons. Kontekst t:', t);
        trelloGlobalContext = t; // Zapisz kontekst 't'
        return [{
            // Upewnij się, że URL do ikony jest publicznie dostępny
            icon: KAMAN_APP_URL + 'vite.svg', // Jeśli vite.svg jest w public/ folderze Twojej aplikacji Vercel
            text: 'Generuj ofertę Kaman', //
            callback: function(t_button_context) {
                trelloGlobalContext = t_button_context; // Zaktualizuj kontekst
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                return t_button_context.card('id')
                    .then(function(card) {
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`; //
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url);
                        return t_button_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750, //
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
        trelloGlobalContext = t; // Zapisz kontekst 't'
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
                return { authorized: false }; // Na wypadek błędu, przyjmij brak autoryzacji
            });
    },
    'show-authorization': function(t, options){
        console.log('MAIN.JS: show-authorization wywołane. Otwieranie popupu autoryzacji. Kontekst t:', t);
        trelloGlobalContext = t; // Zapisz kontekst 't'
        return t.popup({
            title: 'Autoryzacja Kaman Oferty',
            url: `${KAMAN_APP_URL}api/trelloAuth/start`, // Endpoint rozpoczynający OAuth
            height: 680,
            width: 580,
        });
    }
}, {
    // appKey: 'TWOJ_KLUCZ_API_TRELLO', // Podaj, jeśli nie jest w manifeście i jest potrzebny
    appName: 'Kaman Oferty Power-Up' //
});
console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');