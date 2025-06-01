// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com';

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    // console.log('MAIN.JS - AUTH RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type', 'Full data:', event.data);

    const t = trelloGlobalContext || window.TrelloPowerUp.iframe();
    if (!t) {
        console.error("MAIN.JS: Nie można uzyskać kontekstu Trello (t) w listenerze wiadomości.");
        return;
    }
    if (!trelloGlobalContext) trelloGlobalContext = t;

    const { type, accessToken, accessTokenSecret } = event.data || {};

    if (event.origin !== KAMAN_APP_ORIGIN) {
        // Ignoruj wiadomości z innych źródeł w tym listenerze, który jest głównie dla autoryzacji
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
    }
});
console.log('MAIN.JS: Listener wiadomości autoryzacyjnych dodany.');

async function handleSavePdfData(t_context, dataFromPopup) {
    console.log('MAIN.JS - handleSavePdfData: Rozpoczęto. Otrzymane dane z popupu:', dataFromPopup);

    if (!t_context) {
        console.error('MAIN.JS - handleSavePdfData: Krytyczny błąd - Brak kontekstu Trello (t_context).');
        const fallbackT = trelloGlobalContext || window.TrelloPowerUp.iframe();
        if (fallbackT && fallbackT.alert) {
             fallbackT.alert({message: 'Błąd wewnętrzny: Brak kontekstu Trello do zapisu.', duration: 7, display: 'error'});
        }
        return;
    }

    if (!dataFromPopup || typeof dataFromPopup !== 'object') {
        console.warn('MAIN.JS - handleSavePdfData: Otrzymano puste lub niepoprawne dane z popupu.');
        // Nie pokazuj błędu użytkownikowi, jeśli to było np. zamknięcie popupu przez X
        // Chyba że spodziewamy się zawsze danych - wtedy można dodać alert.
        return;
    }

    // Logika dla danych testowych (jeśli nadal używasz typu SUPER_MINIMAL_TEST_V2)
    if (dataFromPopup.type === 'SUPER_MINIMAL_TEST_V2') {
        console.log('MAIN.JS - handleSavePdfData: Przetwarzanie SUPER_MINIMAL_TEST_V2. CardId:', dataFromPopup.cardId, "Wiadomość:", dataFromPopup.message);
        t_context.alert({ message: `Test SUPER_MINIMAL_TEST_V2 odebrany! CardId: ${dataFromPopup.cardId || 'BRAK ID KARTY'}`, duration: 7, display: 'info' });
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

            const responseText = await response.text(); // Zawsze próbuj odczytać tekst, nawet przy błędzie

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
        console.warn('MAIN.JS - handleSavePdfData: Otrzymano dane z popupu nieznanego typu:', dataFromPopup.type, dataFromPopup);
    }
}


TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        // console.log('MAIN.JS: Wywołano `board-buttons` capability.');
        trelloGlobalContext = t;
        return [];
    },
    'card-buttons': function(t_button_context, options) { // Kontekst z momentu inicjalizacji przycisku
        // console.log('MAIN.JS: Inicjalizacja card-buttons.');
        trelloGlobalContext = t_button_context;
        return [{
            icon: KAMAN_APP_URL + 'vite.svg',
            text: 'Generuj ofertę Kaman',
            callback: function(t_click_context) { // Kontekst z momentu kliknięcia przycisku
                trelloGlobalContext = t_click_context;
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                
                // Użyj t_click_context do operacji związanych z tym kliknięciem
                return t_click_context.card('id')
                    .then(function(card) {
                        if (!card || !card.id) {
                            console.error('MAIN.JS: Nie udało się pobrać ID karty.');
                            t_click_context.alert({message: 'Nie udało się pobrać ID karty.', duration: 5, display: 'error'});
                            throw new Error('Nie udało się pobrać ID karty.'); // Przerwij Promise chain
                        }
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url, 'i args:', { cardId: cardId });
                        
                        return t_click_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750,
                            args: { cardId: cardId }
                        });
                    })
                    .then(function(popupReturnData) {
                        // Ten blok jest teraz głównym miejscem odbioru danych z t.closePopup()
                        console.log('MAIN.JS - card-buttons .then() po t.popup(): Promise z popupu rozwiązany. Otrzymane dane:', popupReturnData);
                        
                        // Przekaż t_click_context do handleSavePdfData, ponieważ to jest kontekst związany z akcją użytkownika
                        handleSavePdfData(t_click_context, popupReturnData);
                    })
                    .catch(function(error) {
                        console.error('MAIN.JS: Błąd w łańcuchu promise dla t.card("id") lub t.popup():', error);
                        if (t_click_context && t_click_context.alert) {
                            t_click_context.alert({
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
                // console.log('MAIN.JS: Auth token z t.get:', authToken ? 'JEST' : 'BRAK');
                return { authorized: !!authToken };
            })
            .catch(err => {
                console.error("MAIN.JS: Błąd sprawdzania statusu autoryzacji:", err);
                return { authorized: false }; // W przypadku błędu, załóż, że nieautoryzowany
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
    appKey: 'TWÓJ_PUBLICZNY_KLUCZ_API_TRELLO' // ZASTĄP TO SWOIM KLUCZEM!
});
// console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');