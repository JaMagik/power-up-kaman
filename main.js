// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com';

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

// Listener TYLKO dla wiadomości autoryzacyjnych z callback.js
window.addEventListener('message', async (event) => {
    console.log('MAIN.JS - AUTH RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type', 'Full data:', event.data);

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
        } else if (event.origin) {
            console.warn('MAIN.JS: Wiadomość autoryzacji z nieoczekiwanego źródła odrzucona:', event.origin, 'Dane:', event.data);
        }
        return;
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
    } else if (type) {
        console.log('MAIN.JS: Otrzymano inną wiadomość z KAMAN_APP_ORIGIN w listenerze auth:', event.data);
    }
});
console.log('MAIN.JS: Listener wiadomości autoryzacyjnych dodany.');

async function handleSavePdfData(t_context, pdfData) {
    console.log('MAIN.JS - handleSavePdfData: Rozpoczęto. Otrzymane dane PDF:', {
        type: pdfData.type,
        pdfName: pdfData.pdfName,
        cardId: pdfData.cardId,
        // Sprawdzamy czy pdfDataUrl istnieje przed próbą odczytania długości
        pdfDataUrlLength: pdfData.pdfDataUrl ? pdfData.pdfDataUrl.length : (pdfData.pdfDataUrlPreview ? pdfData.pdfDataUrlPreview.length + ' (preview)' : 'N/A')
    });
    const { pdfDataUrl, pdfName, cardId } = pdfData;

    if (!t_context) {
        console.error('MAIN.JS - handleSavePdfData: Krytyczny błąd - Brak kontekstu Trello (t_context).');
        const fallbackT = trelloGlobalContext || window.TrelloPowerUp.iframe();
        if (fallbackT && fallbackT.alert) {
             fallbackT.alert({message: 'Błąd wewnętrzny: Brak kontekstu Trello do zapisu.', duration: 7, display: 'error'});
        }
        return;
    }

    // Dla testu minimalnego, pdfDataUrl może nie istnieć, ale pdfName i cardId powinny
    if ((!pdfDataUrl && pdfData.type === 'TRELLO_SAVE_PDF') || !pdfName || !cardId) {
        console.error('MAIN.JS - handleSavePdfData: Brak kompletnych danych PDF (lub cardId/pdfName) do zapisu.', pdfData);
        t_context.alert({message: 'Brak kompletnych danych (PDF/cardId/pdfName) do zapisu. Spróbuj ponownie.', duration: 5, display: 'error'});
        return;
    }
    
    // Jeśli to był tylko test komunikacji bez PDF, nie rób nic więcej
    if (pdfData.type === 'MINIMAL_TEST_SUCCESS' && !pdfDataUrl) {
        console.log('MAIN.JS - handleSavePdfData: Otrzymano MINIMAL_TEST_SUCCESS bez pdfDataUrl, nie podejmowano próby zapisu do Trello API.');
        t_context.alert({ message: 'Test komunikacji popup->main.js udany (bez wysyłania PDF)!', duration: 6, display: 'info' });
        return;
    }
    
    if (pdfData.type !== 'TRELLO_SAVE_PDF') {
        console.warn('MAIN.JS - handleSavePdfData: Otrzymano dane nie będące typu TRELLO_SAVE_PDF, pomijanie zapisu do API.', pdfData.type);
        return;
    }


    try {
        console.log('MAIN.JS - handleSavePdfData: Pobieranie tokenów...');
        const storedToken = await t_context.get('member', 'private', 'authToken');
        const storedTokenSecret = await t_context.get('member', 'private', 'authTokenSecret');

        if (!storedToken || !storedTokenSecret) {
            console.log('MAIN.JS - handleSavePdfData: Brak tokenów autoryzacyjnych. Proszę najpierw autoryzować Power-Up.');
            t_context.alert({
                message: 'Brak autoryzacji. Użyj opcji "Autoryzuj Kaman Oferty" (w menu Power-Upa), aby się zalogować.',
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

        const responseText = await response.text();

        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log('MAIN.JS - handleSavePdfData: SUKCES - Plik zapisany w Trello:', result);
            t_context.alert({ message: 'Oferta PDF została pomyślnie zapisana w Trello!', duration: 5, display: 'success' });
        } else {
            console.error('MAIN.JS - handleSavePdfData: BŁĄD - Nie udało się zapisać pliku do Trello:', response.status, responseText);
            t_context.alert({ message: `Błąd zapisu do Trello: ${responseText || response.statusText}`, duration: 10, display: 'error' });
        }
    } catch (error) {
        console.error('MAIN.JS - handleSavePdfData: BŁĄD - Wyjątek krytyczny:', error);
        t_context.alert({ message: `Krytyczny błąd systemowy podczas zapisu: ${error.message}`, duration: 10, display: 'error' });
    }
}

TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        console.log('MAIN.JS: Wywołano `board-buttons` capability.');
        trelloGlobalContext = t;
        return []; // Pusta tablica, jeśli nie ma przycisków na poziomie tablicy
    },
    'card-buttons': function(t_button_context_init, options) { // Zmieniona nazwa dla jasności etapu inicjalizacji
        console.log('MAIN.JS: Inicjalizacja card-buttons. Kontekst inicjalizacyjny (t_button_context_init):', !!t_button_context_init);
        trelloGlobalContext = t_button_context_init; // Ustawienie globalnego kontekstu przy inicjalizacji
        console.log('MAIN.JS: card-buttons (init) - typeof t_button_context_init.popup:', typeof t_button_context_init.popup);

        return [{
            icon: KAMAN_APP_URL + 'vite.svg', // Upewnij się, że ta ścieżka jest poprawna i dostępna
            text: 'Generuj ofertę Kaman',
            callback: function(t_callback_context) { // To 't' jest specyficzne dla tego callbacku kliknięcia
                // Używaj t_callback_context dla operacji związanych z tym konkretnym kliknięciem
                trelloGlobalContext = t_callback_context; // Możesz zaktualizować globalny kontekst, jeśli potrzebne dla innych operacji
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany. Kontekst przycisku (t_callback_context):', !!t_callback_context);
                
                return t_callback_context.card('id')
                    .then(function(card) {
                        if (!card || !card.id) {
                            console.error('MAIN.JS: Nie udało się pobrać ID karty z t.card("id").');
                            t_callback_context.alert({message: 'Nie udało się pobrać ID karty. Spróbuj ponownie.', duration: 5, display: 'error'});
                            throw new Error('Nie udało się pobrać ID karty.');
                        }
                        const cardId = card.id;
                        // URL dla popupa, przekazanie cardId przez URL query param jest dobrym fallbackiem
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`; 
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url, 'i args:', { cardId: cardId });
                        
                        return t_callback_context.popup({ // Użycie t_callback_context do otwarcia popupu
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750, // Możesz dostosować wysokość
                            args: { cardId: cardId } // Przekazanie cardId do popupa również przez args
                        });
                    })
                    .then(function(popupReturnData) { // Ten Promise powinien być rozwiązany po t.closePopup()
                        console.log('MAIN.JS - card-buttons .then(): Promise z popupu rozwiązany. Otrzymane dane:', popupReturnData);
                        
                        if (popupReturnData && typeof popupReturnData === 'object') {
                            if (popupReturnData.type === 'MINIMAL_TEST_SUCCESS') {
                                console.log('MAIN.JS: Dane typu MINIMAL_TEST_SUCCESS otrzymane! Dane:', popupReturnData);
                                t_callback_context.alert({ message: 'MAIN.JS: Otrzymano MINIMAL_TEST_SUCCESS!', duration: 5, display: 'success' });
                                // Na tym etapie testu minimalnego można zakończyć lub wywołać handleSavePdfData, jeśli chcesz zobaczyć, co zrobi z tymi danymi
                                // return handleSavePdfData(t_callback_context, popupReturnData); // Odkomentuj jeśli chcesz testować przepływ do handleSavePdfData
                            } else if (popupReturnData.type === 'TRELLO_SAVE_PDF') {
                                console.log('MAIN.JS: Dane typu TRELLO_SAVE_PDF otrzymane! Wywoływanie handleSavePdfData. Dane:', popupReturnData);
                                return handleSavePdfData(t_callback_context, popupReturnData);
                            } else {
                                console.warn('MAIN.JS: Popup React zamknięty, ale zwrócone dane nie są oczekiwanego typu (ani MINIMAL_TEST_SUCCESS, ani TRELLO_SAVE_PDF):', popupReturnData);
                                t_callback_context.alert({ message: 'Otrzymano nieoczekiwane dane z popupu.', duration: 5, display: 'warning' });
                            }
                        } else {
                            console.log('MAIN.JS: Popup React zamknięty bez zwrócenia danych (np. przez użytkownika klikającego X lub Esc, lub popupReturnData jest undefined).');
                            // To jest często normalne zachowanie, jeśli użytkownik zamknie popup manualnie
                        }
                    })
                    .catch(function(error) {
                        console.error('MAIN.JS: Błąd w łańcuchu promise dla t.popup() (card-buttons):', error);
                        if (t_callback_context && t_callback_context.alert) {
                            t_callback_context.alert({
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
                return { authorized: false };
            });
    },
    'show-authorization': function(t, options){
        console.log('MAIN.JS: show-authorization wywołane.');
        trelloGlobalContext = t;
        return t.popup({
            title: 'Autoryzacja Kaman Oferty',
            url: `${KAMAN_APP_URL}api/trelloAuth/start`, // Upewnij się, że ten URL jest poprawny
            height: 680, // Rozsądna wysokość dla okna autoryzacji
            width: 580,  // Rozsądna szerokość
        });
    }
}, {
    appName: 'Kaman Oferty Power-Up', // Nazwa Twojego Power-Upa
    appKey: process.env.TRELLO_PUBLIC_API_KEY // Jeśli używasz zmiennej środowiskowej dla klucza API
});
console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');