// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
const TRELLO_ORIGIN = 'https://trello.com';

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    // console.log('MAIN.JS - AUTH RAW MESSAGE RECEIVED: Origin:', event.origin, 'Data type:', event.data ? event.data.type : 'No data type');
    if (event.origin !== KAMAN_APP_ORIGIN) {
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
    }
});

async function handleSavePdfData(t_context, dataFromPopup) {
    console.log('MAIN.JS - handleSavePdfData: Rozpoczęto. Otrzymane dane z popupu:', dataFromPopup);

    if (!t_context) {
        console.error('MAIN.JS - handleSavePdfData: Krytyczny błąd - Brak kontekstu Trello (t_context).');
        // ... (obsługa braku kontekstu)
        return;
    }

    if (!dataFromPopup || typeof dataFromPopup !== 'object') {
        console.warn('MAIN.JS - handleSavePdfData: Otrzymano puste lub niepoprawne dane z popupu.');
        t_context.alert({message: 'Nie otrzymano poprawnych danych z formularza oferty.', duration: 5, display: 'error'});
        return;
    }

    // Logika dla danych testowych
    if (dataFromPopup.type === 'SUPER_MINIMAL_TEST_V2') {
        console.log('MAIN.JS - handleSavePdfData: Przetwarzanie SUPER_MINIMAL_TEST_V2. CardId:', dataFromPopup.cardId, "Wiadomość:", dataFromPopup.message);
        t_context.alert({ message: `Test SUPER_MINIMAL_TEST_V2 odebrany! CardId: ${dataFromPopup.cardId || 'BRAK ID KARTY W DANYCH Z POPUPU!'}`, duration: 7, display: 'info' });
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

        // ... (reszta logiki zapisu PDF, pobieranie tokenów, fetch do /api/saveToTrello) ...
        // Ta część powinna być podobna do poprzedniej wersji
        try {
            console.log('MAIN.JS - handleSavePdfData: Pobieranie tokenów dla zapisu PDF...');
            const storedToken = await t_context.get('member', 'private', 'authToken');
            const storedTokenSecret = await t_context.get('member', 'private', 'authTokenSecret');

            if (!storedToken || !storedTokenSecret) {
                // ... (obsługa braku tokenów) ...
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
                // ... (sukces) ...
            } else {
                // ... (błąd) ...
            }
        } catch (error) {
            // ... (błąd krytyczny) ...
        }

    } else {
        console.warn('MAIN.JS - handleSavePdfData: Otrzymano dane z popupu nieznanego typu:', dataFromPopup.type);
    }
}


TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        trelloGlobalContext = t;
        return [];
    },
    'card-buttons': function(t_button_context, options) { // Używamy t_button_context jako kontekstu inicjalizacji tej zdolności
        trelloGlobalContext = t_button_context;
        console.log('MAIN.JS: Inicjalizacja card-buttons.');

        return [{
            icon: KAMAN_APP_URL + 'vite.svg', // Upewnij się, że ta ikona jest dostępna
            text: 'Generuj ofertę Kaman',
            callback: function(t_click_context) { // Ten kontekst 't' jest z momentu kliknięcia przycisku
                trelloGlobalContext = t_click_context; // Aktualizuj globalny kontekst, jeśli potrzebne
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');

                // Bezpośrednie wywołanie t.popup() bez oczekiwania na t.card('id')
                // Popup sam pobierze cardId
                const popupUrl = `${KAMAN_APP_URL}`; // Popup sam doda ?trelloCardId=... jeśli go nie ma,
                                                      // lub odczyta z t.getContext()
                console.log('MAIN.JS: Próba natychmiastowego otwarcia popupu. URL (bazowy):', popupUrl);

                return t_click_context.popup({ // Użyj kontekstu z kliknięcia
                    title: 'Generator Ofert Kaman',
                    url: popupUrl, 
                    // args: {} // args są opcjonalne; UnifiedOfferForm i tak powinien próbować t.getContext().card
                    height: 750,
                    callback: function(t_popup_cb_context, options) { // Callback dla zamknięcia popupu
                        // t_popup_cb_context to kontekst specyficzny dla tego zdarzenia zamknięcia
                        console.log('MAIN.JS: Popup zamknięty (callback z opcji t.popup).');
                        console.log('MAIN.JS: Opcje zamknięcia popupu:', options);

                        if (options && options.args) {
                            console.log('MAIN.JS: Dane z closePopup (przez callback w opcjach):', options.args);
                            // Użyj t_click_context (kontekst z pierwotnego kliknięcia przycisku)
                            // dla operacji takich jak alerty czy zapis do storage.
                            handleSavePdfData(t_click_context, options.args);
                        } else {
                            console.log('MAIN.JS: Popup zamknięty (callback w opcjach t.popup) bez danych w options.args.');
                            // t_click_context.alert({ message: 'Formularz zamknięty bez zapisu.', duration: 3, display: 'info'});
                        }
                    }
                });
            }
        }];
    },
    'authorization-status': function(t, options){
        trelloGlobalContext = t;
        return t.get('member', 'private', 'authToken')
            .then(function(authToken){
                return { authorized: !!authToken };
            })
            .catch(err => {
                console.error("MAIN.JS: Błąd sprawdzania statusu autoryzacji:", err);
                return { authorized: false };
            });
    },
    'show-authorization': function(t, options){
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
});