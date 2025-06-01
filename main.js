// main.js
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
const KAMAN_APP_ORIGIN = new URL(KAMAN_APP_URL).origin;

let trelloGlobalContext = null;

console.log('START: main.js Power-Up skrypt ładowany. App URL:', KAMAN_APP_URL);

window.addEventListener('message', async (event) => {
    if (event.origin !== KAMAN_APP_ORIGIN) {
        return;
    }

    const t = trelloGlobalContext;
    if (!t) {
        console.error("MAIN.JS (EventListener): Brak trelloGlobalContext. Nie można przetworzyć wiadomości:", event.data ? event.data.type : 'Brak typu');
        return;
    }

    const { type } = event.data || {};

    if (type === 'TRELLO_SAVE_PDF') {
        handleSavePdfData(t, event.data);
    } else {
        console.log('MAIN.JS (EventListener): Inna wiadomość:', event.data);
    }
});
console.log('MAIN.JS: Listener wiadomości dodany.');

async function handleSavePdfData(t_context, dataFromPopup) {
    console.log('MAIN.JS - handleSavePdfData: Dane z popupu:', dataFromPopup);

    if (!t_context) {
        console.error('MAIN.JS - handleSavePdfData: Brak kontekstu Trello.');
        return;
    }

    const { pdfDataUrl, pdfName, cardId } = dataFromPopup;

    if (!pdfDataUrl || !pdfName || !cardId) {
        console.error('MAIN.JS - handleSavePdfData: Brak kompletnych danych dla TRELLO_SAVE_PDF.', dataFromPopup);
        t_context.alert({ message: 'Brak kompletnych danych PDF do zapisu.', duration: 5, display: 'error' });
        return;
    }

    try {
        // Konwersja base64 na Blob
        const response = await fetch(pdfDataUrl);
        const blob = await response.blob();

        // Utwórz obiekt File z Blob i nazwą
        const file = new File([blob], pdfName, { type: 'application/pdf' });

        console.log('MAIN.JS - handleSavePdfData: Próbuję dodać załącznik do karty przez t.attach()...');
        await t_context.attach({
            name: pdfName,
            url: pdfDataUrl,
            file: file,
            mimeType: 'application/pdf'
        });

        console.log('MAIN.JS - handleSavePdfData: Załącznik dodany.');
        t_context.alert({ message: 'Oferta PDF zapisana w Trello!', duration: 5, display: 'success' });
    } catch (error) {
        console.error('MAIN.JS - handleSavePdfData: Błąd:', error);
        t_context.alert({ message: `Błąd zapisu załącznika: ${error.message}`, duration: 8, display: 'error' });
    }
}

TrelloPowerUp.initialize({
    'board-buttons': function (t, options) {
        trelloGlobalContext = t;
        return [];
    },
    'card-buttons': function (t, options) {
        trelloGlobalContext = t;
        console.log('MAIN.JS: Inicjalizacja card-buttons.');
        return [{
            icon: KAMAN_APP_URL + 'vite.svg',
            text: 'Generuj ofertę Kaman',
            callback: function (t_click_context) {
                trelloGlobalContext = t_click_context;
                console.log('MAIN.JS: Callback "Generuj ofertę Kaman" wywołany.');
                return t_click_context.card('id')
                    .then(function (card) {
                        if (!card || !card.id) {
                            console.error('MAIN.JS: Nie udało się pobrać ID karty.');
                            throw new Error('Nie udało się pobrać ID karty.');
                        }
                        const cardId = card.id;
                        const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
                        console.log('MAIN.JS: Otwieranie popupu:', url);
                        return t_click_context.popup({
                            title: 'Generator Ofert Kaman',
                            url: url,
                            height: 750,
                            args: { cardId }
                        });
                    })
                    .then(function (popupReturnData) {
                        console.log('MAIN.JS: popupReturnData:', popupReturnData);
                        if (popupReturnData) {
                            handleSavePdfData(t_click_context, popupReturnData);
                        }
                    })
                    .catch(function (error) {
                        console.error('MAIN.JS: Błąd w callbacku "Generuj ofertę Kaman":', error);
                        t_click_context.alert({ message: `Błąd: ${error.message || 'Nieznany błąd'}`, duration: 6, display: 'error' });
                    });
            }
        }];
    }
}, {
    appName: 'Kaman Oferty Power-Up',
    appKey: '0f932c28c8d97d03741c8863c2ff4afb'
});
console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');
