// main.js - Power-Up (działa w iframe Power-Upa Trello)

const KAMAN_APP_URL = 'https://<TWOJA_RZECZYWISTA_NAZWA_APLIKACJI>.vercel.app'; // Zastąp poprawnym URL

// Funkcja pomocnicza do przechowywania tokenów
const storeTokens = async (t, tokens) => {
  if (tokens && tokens.accessToken && tokens.accessTokenSecret) {
    return t.store('member', 'private', 'kamanTrelloTokens', tokens);
  }
  return Promise.resolve();
};

// Funkcja pomocnicza do pobierania tokenów
const getStoredTokens = (t) => {
  return t.load('member', 'private', 'kamanTrelloTokens');
};

TrelloPowerUp.initialize({
  'card-buttons': function(t, options) {
    return [{
      icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg', //
      text: 'Generuj ofertę Kaman', //
      callback: function(t) { //
        return t.card('id', 'name') //
          .then(function(card) {
            const cardId = card.id;
            // Otwórz popup do Twojej aplikacji generującej PDF
            const url = `${KAMAN_APP_URL}/?trelloCardId=${cardId}`; //
            return t.popup({ //
              title: 'Generator Ofert Kaman', //
              url: url, //
              height: 750, //
              args: { cardId: cardId } // Przekaż cardId również przez args dla pewności
            });
          });
      }
    }];
  },
  // Dodaj capability do obsługi autoryzacji, jeśli chcesz, aby Trello zarządzało przyciskiem "Authorize"
  // 'authorization-status': async function(t, options) {
  //   const tokens = await getStoredTokens(t);
  //   return { authorized: !!(tokens && tokens.accessToken) };
  // },
  // 'show-authorization': function(t, options) {
  //   // Ta funkcja jest wywoływana, gdy użytkownik kliknie standardowy przycisk autoryzacji Trello
  //   // lub gdy Trello wykryje, że autoryzacja jest wymagana.
  //   const startAuthApiUrl = `${KAMAN_APP_URL}/api/trelloAuth/start`;
  //   return t.authorize(startAuthApiUrl, { height: 680, width: 580, validToken: () => false }) // validToken: false wymusza okno autoryzacji
  //     .then(async () => {
  //       // t.authorize() rozwiązuje się PO tym, jak callback.js wywoła closeAuthorize().
  //       // W tym momencie tokeny powinny być dostępne lub zapisane przez Twój backend/callback.
  //       // Tutaj możesz np. zapisać globalny token, jeśli Trello go zwraca, lub potwierdzić użytkownikowi.
  //       // Jeśli Twój callback.js nie komunikuje tokenów bezpośrednio do main.js,
  //       // będziesz musiał je pobrać z backendu lub poczekać na inną formę sygnalizacji.
  //       t.alert({ message: 'Autoryzacja Trello zakończona.', duration: 5 });
  //       // Możesz tu ponownie załadować kontekst lub odświeżyć UI.
  //     })
  //     .catch(TrelloPowerUp.PostMessageIO.Timeout, function() {
  //       t.alert({ message: 'Przekroczono czas autoryzacji Trello.', type: 'error', duration: 5 });
  //     })
  //     .catch(function(err) {
  //       console.error('Błąd podczas t.authorize:', err);
  //       t.alert({ message: 'Błąd autoryzacji Trello.', type: 'error', duration: 5 });
  //     });
  // }
});

// Odbiór wiadomości z Twojej aplikacji (PDF, żądania autoryzacji, itp.)
window.addEventListener('message', async (event) => { //
  const t = window.TrelloPowerUp.iframe(); //

  // Sprawdź origin dla bezpieczeństwa, jeśli to możliwe
  // if (event.origin !== KAMAN_APP_URL) {
  //   // console.warn('Odrzucono wiadomość z nieznanego źródła:', event.origin);
  //   // return;
  // }

  const eventData = event.data;

  if (eventData && eventData.pdfUrl && eventData.pdfName) { //
    try {
      await t.attach({ //
        url: eventData.pdfUrl, //
        name: eventData.pdfName, //
        mimeType: 'application/pdf' //
      });
      // alert('Oferta została zapisana na karcie Trello!'); // Można zostawić, ale t.alert jest lepsze
      t.alert({ message: 'Oferta została zapisana na karcie Trello!', duration: 5, display: 'success' });
      t.closePopup(); //
    } catch (err) {
      console.error('Błąd podczas zapisywania PDF w Trello:', err); //
      t.alert({ message: 'Błąd zapisu PDF do Trello.', duration: 5, display: 'error' });
    }
  } else if (eventData && eventData.type === 'initiateTrelloAuth') {
    // Inicjowanie autoryzacji na żądanie z popupu aplikacji Vercel
    const startAuthApiUrl = `${KAMAN_APP_URL}/api/trelloAuth/start`;
    try {
      await t.authorize(startAuthApiUrl, { height: 680, width: 580, validToken: () => false }); // validToken: false zwykle wymusza okno autoryzacji
      // Po rozwiązaniu tej obietnicy (czyli po zamknięciu okna przez callback.js),
      // tokeny powinny być gdzieś zapisane (najlepiej serwerowo przez callback).
      // Możesz wysłać wiadomość z powrotem do popupu, że autoryzacja została zainicjowana/zakończona.
      t.alert({ message: 'Proces autoryzacji Trello zakończony. Spróbuj ponownie zapisać.', duration: 6 });
      if (event.source) { // event.source to okno popupu
        event.source.postMessage({ type: 'trelloAuthFlowCompleted' }, KAMAN_APP_URL);
      }
    } catch (authError) {
      console.error('Trello authorization failed when initiated from popup:', authError);
      t.alert({ message: 'Autoryzacja Trello nie powiodła się.', duration: 5, display: 'error' });
      if (event.source) {
        event.source.postMessage({ type: 'trelloAuthFlowFailed' }, KAMAN_APP_URL);
      }
    }
  } else if (eventData && eventData.type === 'requestTrelloTokens') {
    // Popup prosi o tokeny (np. do wywołania /api/saveToTrello)
    const tokens = await getStoredTokens(t);
    if (event.source) { // event.source to okno popupu
      if (tokens && tokens.accessToken) {
        event.source.postMessage({ type: 'trelloTokensResponse', tokens: tokens }, KAMAN_APP_URL);
      } else {
        event.source.postMessage({ type: 'trelloTokensResponse', tokens: null }, KAMAN_APP_URL);
        // Można tu dodać logikę, np. ponownego wywołania autoryzacji
        // t.alert({ message: 'Brak zapisanych tokenów. Proszę najpierw autoryzować.', duration: 5 });
      }
    }
  } else if (eventData && eventData.type === 'trelloAuthTokensFromCallback') {
    // Bezpośrednie odebranie tokenów z callback.js (jeśli callback.js używa postMessage do main.js)
    // Ta metoda jest mniej standardowa niż poleganie na rozwiązaniu t.authorize()
    if (eventData.tokens) {
      await storeTokens(t, eventData.tokens);
      t.alert({ message: 'Tokeny Trello odebrane i zapisane!', duration: 3, display: 'success' });
      // Poinformuj popup, jeśli jest otwarty
      // To wymagałoby, aby popup miał sposób na identyfikację i nasłuchiwanie
    }
  }
});