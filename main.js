// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com';

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    console.log('MAIN.JS - AUTH RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type');
    if (event.origin !== KAMAN_APP_ORIGIN) {
        if (event.origin === TRELLO_ORIGIN && event.data && event.data.type === 'bulk') {
            // console.log('MAIN.JS: Ignorowanie wiadomości "bulk" z Trello.com w listenerze auth.');
        } else if (event.origin) {
            // console.warn('MAIN.JS: Wiadomość autoryzacji z nieoczekiwanego źródła odrzucona:', event.origin);
        }
        return;
    }

    const t = trelloGlobalContext || window.TrelloPowerUp.iframe();
    if (!t) {
        console.error("MAIN.JS: Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości autoryzacji.");
        return;
    }
    if (!trelloGlobalContext) trelloGlobalContext = t;

    const { type, accessToken, accessTokenSecret } = event.data || {};

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
        // console.log('MAIN.JS: Otrzymano inną wiadomość z KAMAN_APP_ORIGIN w listenerze auth:', event.data);
    }
});
// console.log('MAIN.JS: Listener wiadomości autoryzacyjnych dodany.');

async function handleSavePdfData(t_context, dataFromPopup) { // Zmieniono nazwę argumentu dla jasności
    console.log('MAIN.JS - handleSavePdfData: Rozpoczęto. Otrzymane dane z popupu:', dataFromPopup);

    if (!t_context) {
        console.error('MAIN.JS - handleSavePdfData: Krytyczny błąd - Brak kontekstu Trello (t_context).');
        const fallbackT = trelloGlobalContext || window.TrelloPowerUp.iframe();
        if (fallbackT && fallbackT.alert) {
             fallbackT.alert({message: 'Błąd wewnętrzny: Brak kontekstu Trello do zapisu.', duration: 7, display: 'error'});
        }
        return;
    }

    // Sprawdzamy, czy otrzymaliśmy dane i czy są one oczekiwanego typu
    if (!dataFromPopup || typeof dataFromPopup !== 'object') {
        console.warn('MAIN.JS - handleSavePdfData: Otrzymano puste lub niepoprawne dane z popupu.');
        t_context.alert({message: 'Nie otrzymano poprawnych danych z formularza oferty.', duration: 5, display: 'error'});
        return;
    }

    // Logika dla danych testowych
    if (dataFromPopup.type === 'SUPER_MINIMAL_TEST_V2') {
        console.log('MAIN.JS - handleSavePdfData: Przetwarzanie SUPER_MINIMAL_TEST_V2. CardId:', dataFromPopup.cardId, "Wiadomość:", dataFromPopup.message);
        t_context.alert({ message: `Test SUPER_MINIMAL_TEST_V2 odebrany! CardId: ${dataFromPopup.cardId}`, duration: 7, display: 'info' });
        // Na tym etapie nie próbujemy zapisywać pliku, tylko potwierdzamy odbiór
        return;
    }

    // Logika dla pełnego zapisu PDF
    if (dataFromPopup.type === 'TRELLO_SAVE_PDF') {
        const { pdfDataUrl, pdfName, cardId } = dataFromPopup;

        if (!pdfDataUrl || !pdfName || !cardId) {
            console.error('MAIN.JS - handleSavePdfData: Brak kompletnych danych PDF (pdfDataUrl, pdfName, cardId) do zapisu.', dataFromPopup);
            t_context.alert({message: 'Brak kompletnych danych PDF do zapisu. Spróbuj ponownie.', duration: 5, display: 'error'});
            return;
        }

        try {
            console.log('MAIN.JS - handleSavePdfData: Pobieranie tokenów dla zapisu PDF...');
            const storedToken = await t_context.get('member', 'private', 'authToken');
            const storedTokenSecret = await t_context.get('member', 'private', 'authTokenSecret');

            if (!storedToken || !storedTokenSecret) {
                console.log('MAIN.JS - handleSavePdfData: Brak tokenów autoryzacyjnych do zapisu PDF.');
                t_context.alert({
                    message: 'Brak autoryzacji do zapisu. Użyj opcji "Autoryzuj Kaman Oferty".',
                    duration: 8, display: 'error'
                });
                return;
            }

            console.log('MAIN.JS - handleSavePdfData: Tokeny znalezione. Próba zapisu PDF do Trello. CardId:', cardId);
            const saveApiUrl = `${KAMAN_APP_URL}api/saveToTrello`;
            
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
                console.log('MAIN.JS - handleSavePdfData: SUKCES - Plik PDF zapisany w Trello:', result);
                t_context.alert({ message: 'Oferta PDF została pomyślnie zapisana w Trello!', duration: 5, display: 'success' });
            } else {
                console.error('MAIN.JS - handleSavePdfData: BŁĄD - Nie udało się zapisać pliku PDF do Trello:', response.status, responseText);
                t_context.alert({ message: `Błąd zapisu PDF do Trello: ${responseText || response.statusText}`, duration: 10, display: 'error' });
            }
        } catch (error) {
            console.error('MAIN.JS - handleSavePdfData: BŁĄD KRYTYCZNY podczas zapisu PDF:', error);
            t_context.alert({ message: `Krytyczny błąd systemowy podczas zapisu PDF: ${error.message}`, duration: 10, display: 'error' });
        }
    } else {
        console.warn('MAIN.JS - handleSavePdfData: Otrzymano dane z popupu nieznanego typu:', dataFromPopup.type);
    }
}

TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        // console.log('MAIN.JS: Wywołano `board-buttons` capability.');
        trelloGlobalContext = t;
        return [];
    },
    'card-buttons': function(t_button_context_init, options) {
        // console.log('MAIN.JS: Inicjalizacja card-buttons. Kontekst inicjalizacyjny (t_button_context_init):', !!t_button_context_init);
        trelloGlobalContext = t_button_context_init;

        return [{
            icon: KAMAN_APP_URL + 'vite.svg',
            text: 'Generuj ofertę Kaman',
            callback: function(t_callback_context) {
                trelloGlobalContext = t_callback_context;
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                
                t_callback_context.card('id')
                    .then(function(card) {
                        if (!card || !card.id) {
                            console.error('MAIN.JS: Nie udało się pobrać ID karty.');
                            t_callback_context.alert({message: 'Nie udało się pobrać ID karty.', duration: 5, display: 'error'});
                            throw new Error('Nie udało się pobrać ID karty.');
                        }
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url, 'i args:', { cardId: cardId });
                        
                        // Użycie callback w opcjach t.popup
                        return t_callback_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750,
                            args: { cardId: cardId },
                            callback: function(t_popup_event_context, options) {
                                // t_popup_event_context to nowy kontekst dla tego callbacku
                                // options zawiera dane zwrócone przez t.closePopup() w polu 'args'
                                console.log('MAIN.JS: Popup zamknięty (callback z opcji t.popup).');
                                console.log('MAIN.JS: Opcje zamknięcia popupu:', options);

                                if (options && options.args) {
                                    console.log('MAIN.JS: Dane z closePopup (przez callback w opcjach):', options.args);
                                    // Przekazujemy kontekst z momentu kliknięcia przycisku, nie t_popup_event_context
                                    handleSavePdfData(t_callback_context, options.args);
                                } else {
                                    console.log('MAIN.JS: Popup zamknięty (callback w opcjach t.popup) bez danych w options.args.');
                                    // Można dodać informację dla użytkownika, jeśli to nieoczekiwane
                                    // t_callback_context.alert({ message: 'Formularz został zamknięty bez zapisu danych.', duration: 3, display: 'info' });
                                }
                            }
                        });
                    })
                    .catch(function(error) { // Ten catch obsłuży błędy z t.card('id') lub t.popup()
                        console.error('MAIN.JS: Błąd podczas otwierania popupu lub pobierania ID karty:', error);
                        if (t_callback_context && t_callback_context.alert) {
                            t_callback_context.alert({
                                message: `Błąd Power-Upa: ${error.message || 'Nieznany błąd'}`,
                                duration: 7, display: 'error'
                            });
                        }
                    });
            }
        }];
    },
    'authorization-status': function(t, options){
        // console.log('MAIN.JS: Sprawdzanie statusu autoryzacji.');
        trelloGlobalContext = t;
        return t.get('member', 'private', 'authToken')
            .then(function(authToken){
                if(authToken){
                    // console.log('MAIN.JS: Status autoryzacji: Zalogowany.');
                    return { authorized: true };
                }
                // console.log('MAIN.JS: Status autoryzacji: Niezalogowany.');
                return { authorized: false };
            })
            .catch(err => {
                console.error("MAIN.JS: Błąd sprawdzania statusu autoryzacji:", err);
                return { authorized: false };
            });
    },
    'show-authorization': function(t, options){
        // console.log('MAIN.JS: show-authorization wywołane.');
        trelloGlobalContext = t;
        return t.popup({
            title: 'Autoryzacja Kaman Oferty',
            url: `${KAMAN_APP_URL}api/trelloAuth/start`,
            height: 680,
            width: 580,
        });
    }
}, {
    appName: 'Kaman Oferty Power-Up',
    // appKey: process.env.TRELLO_PUBLIC_API_KEY // Odkomentuj i upewnij się, że klucz jest dostępny, jeśli Trello tego wymaga
});
// console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');