// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;
// const TRELLO_ORIGIN = 'https://trello.com'; // Mniej istotne dla logiki listenera

let trelloGlobalContext = null; // Będzie ustawiany przez callbacks z Trello.initialize

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    // Sprawdzamy origin TYLKO dla wiadomości autoryzacyjnych
    if (event.origin !== KAMAN_APP_ORIGIN) {
        // console.warn('MAIN.JS (EventListener): Wiadomość z nieoczekiwanego źródła, ignorowanie:', event.origin);
        return;
    }

    // Potrzebujemy kontekstu 't', aby móc użyć t.store.
    // Ten kontekst powinien być już ustawiony przez jedną z funkcji capabilities.
    const t = trelloGlobalContext; 
    if (!t) {
        // Ten log może się pojawić, jeśli wiadomość przyjdzie zanim jakakolwiek capability ustawi trelloGlobalContext.
        // Jest to mniej prawdopodobne dla wiadomości po autoryzacji, bo show-authorization już powinno ustawić 't'.
        console.error("MAIN.JS (EventListener): Brak trelloGlobalContext. Nie można przetworzyć wiadomości:", event.data ? event.data.type : 'Brak typu');
        return;
    }

    const { type, accessToken, accessTokenSecret } = event.data || {};

    if (type === 'TRELLO_AUTH_SUCCESS' && accessToken && accessTokenSecret) {
        console.log('MAIN.JS (EventListener): Przetwarzanie TRELLO_AUTH_SUCCESS.');
        try {
            await t.store('member', 'private', 'authToken', accessToken);
            await t.store('member', 'private', 'authTokenSecret', accessTokenSecret);
            console.log('MAIN.JS (EventListener): Tokeny Trello zapisane w storage.');
            t.alert({ message: 'Autoryzacja Trello zakończona pomyślnie!', duration: 3, display: 'success' });
        } catch (storeError) {
            console.error('MAIN.JS (EventListener): Błąd podczas zapisywania tokenów Trello:', storeError);
            t.alert({ message: 'Nie udało się zapisać tokenów autoryzacyjnych.', duration: 5, display: 'error' });
        }
    } else if (type) {
        console.log('MAIN.JS (EventListener): Otrzymano inną znaną wiadomość z KAMAN_APP_ORIGIN:', event.data);
    }
});
console.log('MAIN.JS: Listener wiadomości autoryzacyjnych dodany.');

async function handleSavePdfData(t_context_from_click, dataFromPopup) {
    console.log('MAIN.JS - handleSavePdfData: Rozpoczęto. Dane z popupu:', dataFromPopup);

    if (!t_context_from_click) {
        console.error('MAIN.JS - handleSavePdfData: Krytyczny błąd - Brak kontekstu Trello.');
        return;
    }

    if (!dataFromPopup || typeof dataFromPopup !== 'object' || !dataFromPopup.type) {
        console.warn('MAIN.JS - handleSavePdfData: Otrzymano puste, niepoprawne lub nietypowe dane z popupu:', dataFromPopup);
        // Nie informuj użytkownika, jeśli np. zamknął popup przez X
        return;
    }

    if (dataFromPopup.type === 'SUPER_MINIMAL_TEST_V2') {
        console.log('MAIN.JS - handleSavePdfData: Przetwarzanie SUPER_MINIMAL_TEST_V2. CardId:', dataFromPopup.cardId);
        t_context_from_click.alert({ message: `Test SUPER_MINIMAL_TEST_V2 odebrany! CardId: ${dataFromPopup.cardId || 'BRAK ID KARTY'}`, duration: 7, display: 'info' });
        return;
    }

    if (dataFromPopup.type === 'TRELLO_SAVE_PDF') {
        const { pdfDataUrl, pdfName, cardId } = dataFromPopup;

        if (!pdfDataUrl || !pdfName || !cardId) {
            console.error('MAIN.JS - handleSavePdfData: Brak kompletnych danych dla TRELLO_SAVE_PDF.', dataFromPopup);
            t_context_from_click.alert({message: 'Brak kompletnych danych PDF do zapisu.', duration: 5, display: 'error'});
            return;
        }

        try {
            const storedToken = await t_context_from_click.get('member', 'private', 'authToken');
            const storedTokenSecret = await t_context_from_click.get('member', 'private', 'authTokenSecret');

            if (!storedToken || !storedTokenSecret) {
                t_context_from_click.alert({ message: 'Brak autoryzacji. Proszę najpierw autoryzować Power-Up.', duration: 8, display: 'error'});
                return;
            }

            const response = await fetch(`${KAMAN_APP_URL}api/saveToTrello`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId, accessToken: storedToken, accessTokenSecret: storedTokenSecret, fileDataUrl, fileName: pdfName })
            });
            const responseText = await response.text();
            if (response.ok) {
                t_context_from_click.alert({ message: 'Oferta PDF zapisana w Trello!', duration: 5, display: 'success' });
            } else {
                t_context_from_click.alert({ message: `Błąd zapisu: ${responseText || response.statusText}`, duration: 10, display: 'error' });
            }
        } catch (error) {
            console.error('MAIN.JS - handleSavePdfData: Wyjątek krytyczny:', error);
            t_context_from_click.alert({ message: `Krytyczny błąd: ${error.message}`, duration: 10, display: 'error' });
        }
    } else {
        console.warn('MAIN.JS - handleSavePdfData: Dane z popupu nieobsługiwanego typu:', dataFromPopup.type);
    }
}

TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        trelloGlobalContext = t; // Ustaw globalny kontekst
        return [];
    },
    'card-buttons': function(t, options) { // 't' tutaj jest kontekstem dla tej capability
        trelloGlobalContext = t; // Ustaw globalny kontekst
        console.log('MAIN.JS: Inicjalizacja card-buttons.');
        return [{
            icon: KAMAN_APP_URL + 'vite.svg',
            text: 'Generuj ofertę Kaman',
            callback: function(t_click_context) { // 't_click_context' jest specyficzny dla tego kliknięcia
                trelloGlobalContext = t_click_context; // Aktualizuj globalny kontekst, jeśli jest potrzebny gdzie indziej
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                return t_click_context.card('id')
                    .then(function(card) {
                        if (!card || !card.id) {
                            console.error('MAIN.JS: Nie udało się pobrać ID karty.');
                            throw new Error('Nie udało się pobrać ID karty.');
                        }
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
                        console.log('MAIN.JS: Otwieranie popupu z URL:', url, 'i args:', { cardId });
                        return t_click_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750,
                            args: { cardId }
                        });
                    })
                    .then(function(popupReturnData) {
                        console.log('MAIN.JS - card-buttons .then() po t.popup(): Promise rozwiązany. Otrzymane dane:', popupReturnData);
                        handleSavePdfData(t_click_context, popupReturnData); // Użyj t_click_context
                    })
                    .catch(function(error) {
                        console.error('MAIN.JS: Błąd w callbacku "Generuj ofertę Kaman" lub otwieraniu popupu:', error);
                        t_click_context.alert({ message: `Błąd: ${error.message || 'Nieznany błąd'}`, duration: 6, display: 'error'});
                    });
            }
        }];
    },
    'authorization-status': function(t, options){
        trelloGlobalContext = t; // Ustaw globalny kontekst
        // console.log('MAIN.JS: Sprawdzanie statusu autoryzacji.');
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
        trelloGlobalContext = t; // Ustaw globalny kontekst
        // console.log('MAIN.JS: show-authorization wywołane.');
        return t.popup({
            title: 'Autoryzacja Kaman Oferty',
            url: `${KAMAN_APP_URL}api/trelloAuth/start`,
            height: 680,
            width: 580,
        });
    }
}, {
    appName: 'Kaman Oferty Power-Up',
    appKey: 'TWÓJ_PUBLICZNY_KLUCZ_API_TRELLO' // <-- WAŻNE: ZASTĄP TO SWOIM KLUCZEM!
});
console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');