const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';

TrelloPowerUp.initialize({
  'card-buttons': function (t, options) {
    return [{
      icon: KAMAN_APP_URL + 'vite.svg',
      text: 'Generuj ofertę Kaman',
      callback: function (t_click_context) {
        return t_click_context.card('id')
          .then(function (card) {
            if (!card || !card.id) {
              throw new Error('Nie udało się pobrać ID karty.');
            }
            const cardId = card.id;
            const url = `${KAMAN_APP_URL}?trelloCardId=${cardId}`;
            console.log('MAIN.JS: Otwieranie popupu:', url);
            return t_click_context.popup({
              title: 'Generator Ofert Kaman',
              url: url,
              height: 750,
              width: 900,
              args: { cardId }
            });
          })
          .then(function (popupReturnData) {
            console.log('MAIN.JS: popupReturnData:', popupReturnData);
            if (popupReturnData && popupReturnData.type === 'TRELLO_SAVE_PDF') {
              const { pdfDataUrl, pdfName } = popupReturnData;
              // Konwersja base64 -> Blob
              return fetch(pdfDataUrl)
                .then(res => res.blob())
                .then(blob => {
                  const file = new File([blob], pdfName, { type: 'application/pdf' });
                  console.log('MAIN.JS: Dodawanie załącznika do karty...');
                  return t_click_context.attach({
                    name: pdfName,
                    url: pdfDataUrl,
                    file: file,
                    mimeType: 'application/pdf'
                  });
                })
                .then(() => {
                  console.log('MAIN.JS: Załącznik dodany.');
                  t_click_context.alert({ message: 'Oferta PDF zapisana w Trello!', duration: 5, display: 'success' });
                })
                .catch(err => {
                  console.error('MAIN.JS: Błąd zapisu załącznika:', err);
                  t_click_context.alert({ message: `Błąd zapisu: ${err.message}`, duration: 8, display: 'error' });
                });
            }
          })
          .catch(function (error) {
            console.error('MAIN.JS: Błąd w callbacku:', error);
            t_click_context.alert({ message: `Błąd: ${error.message || 'Nieznany'}`, duration: 6, display: 'error' });
          });
      }
    }];
  }
}, {
  appName: 'Kaman Oferty Power-Up'
});

console.log('MAIN.JS: TrelloPowerUp.initialize zakończone.');
