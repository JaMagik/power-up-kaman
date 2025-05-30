// main.js - Power-Up (działa w iframe Power-Upa Trello)

const KAMAN_APP_URL = 'https://<TWOJA_RZECZYWISTA_NAZWA_APLIKACJI>.vercel.app'; // Zastąp poprawnym URL

// Funkcja pomocnicza do przechowywania tokenów
// Te funkcje używają 't', więc muszą być wywoływane z kontekstem 't'
const storeTokens = async (t, tokens) => {
  if (tokens && tokens.accessToken && tokens.accessTokenSecret) {
    return t.store('member', 'private', 'kamanTrelloTokens', tokens);
  }
  return t.Promise.resolve(); // Użyj TrelloPowerUp.Promise
};

// Funkcja pomocnicza do pobierania tokenów
const getStoredTokens = (t) => {
  return t.load('member', 'private', 'kamanTrelloTokens');
};

TrelloPowerUp.initialize({
  'card-buttons': function(t, options) { // 't' jest tutaj przekazywane
    return [{
      icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg', //
      text: 'Generuj ofertę Kaman', //
      callback: function(t_button_context) { // Użyj innej nazwy, aby uniknąć konfliktu, jeśli `t` jest globalne
        return t_button_context.card('id', 'name') //
          .then(function(card) {
            const cardId = card.id;
            const url = `${KAMAN_APP_URL}/?trelloCardId=${cardId}`; //
            
            // Zapisz kontekst 't' lub cardId, jeśli listener 'message' będzie go potrzebował
            // To jest obejście problemu, jeśli globalne metody TrelloPowerUp nie działają w listenerze
            window.currentTrelloContext = t_button_context;
            window.currentCardId = cardId;


            return t_button_context.popup({ //
              title: 'Generator Ofert Kaman', //
              url: url, //
              height: 750, //
              args: { cardId: cardId }
            });
          });
      }
    }];
  }
  // Inne capabilities, np. autoryzacyjne, jeśli potrzebujesz
  // 'authorization-status': async function(t, options) {
  //   const tokens = await getStoredTokens(t);
  //   return { authorized: !!(tokens && tokens.accessToken) };
  // },
  // 'show-authorization': function(t, options) {
  //   const startAuthApiUrl = `${KAMAN_APP_URL}/api/trelloAuth/start`;
  //   return t.authorize(startAuthApiUrl, { height: 680, width: 580, validToken: () => false })
  //     .then(async () => {
  //       t.alert({ message: 'Autoryzacja Trello zakończona.', duration: 5 });
  //       // Tutaj możesz np. wysłać wiadomość do otwartego popupu, jeśli istnieje,
  //       // że autoryzacja się powiodła.
  //       if (window.lastOpenedPopup && !window.lastOpenedPopup.closed) {
  //          window.lastOpenedPopup.postMessage({ type: 'trelloAuthFlowCompletedFromMain' }, KAMAN_APP_URL);
  //       }
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
// Ten listener jest w globalnym zakresie pliku konektora
window.addEventListener('message', async (event) => { //
  // WAŻNE: Sprawdź origin dla bezpieczeństwa!
  // if (event.origin !== KAMAN_APP_URL) {
  //   console.warn('Odrzucono wiadomość z nieoczekiwanego źródła:', event.origin);
  //   return;
  // }

  const eventData = event.data;
  const t_context = window.currentTrelloContext; // Użyj zapisanego kontekstu

  if (!t_context) {
    // console.warn('Brak kontekstu Trello (t_context) w listenerze wiadomości. Popup mógł nie zostać otwarty przez Power-Up.');
    // Możesz użyć TrelloPowerUp.Promise i innych globalnych metod, ale operacje kontekstowe jak attach/closePopup wymagają 't'
    // W niektórych przypadkach Trello może dostarczyć globalny kontekst, ale poleganie na tym jest ryzykowne.
    // Jeśli 't_context' jest null, oznacza to, że popup nie został poprawnie otwarty
    // lub wiadomość przyszła zanim kontekst został ustawiony.
    // Rozważ użycie `TrelloPowerUp.getContext()` jeśli dostępne, ale to też może być problematyczne poza callbackami.
    // Najlepiej jest, gdy metody `TrelloPowerUp.closePopup()` itp. działają globalnie.
  }

  if (eventData && eventData.pdfUrl && eventData.pdfName) { //
    try {
      // Spróbuj użyć globalnych metod SDK, jeśli są dostępne i działają w tym kontekście
      await window.TrelloPowerUp.attach({ //
        url: eventData.pdfUrl, //
        name: eventData.pdfName, //
        // mimeType jest opcjonalny dla t.attach, Trello spróbuje go wykryć
      });
      window.TrelloPowerUp.alert({ message: 'Oferta została zapisana na karcie Trello!', duration: 5, display: 'success' });
      window.TrelloPowerUp.closePopup(); //
    } catch (err) {
      console.error('Błąd podczas zapisywania PDF w Trello:', err); //
      if (t_context) { // Jeśli mamy kontekst, użyjmy go do alertu
        t_context.alert({ message: 'Błąd zapisu PDF do Trello.', duration: 5, display: 'error' });
      } else {
        alert('Błąd zapisu PDF do Trello.');
      }
    }
  } else if (eventData && eventData.type === 'initiateTrelloAuth') {
    if (!t_context) {
      console.error('Nie można zainicjować autoryzacji: brak kontekstu Trello.');
      alert('Błąd: Nie można zainicjować autoryzacji Trello z tego miejsca.');
      return;
    }
    const startAuthApiUrl = `${KAMAN_APP_URL}/api/trelloAuth/start`;
    try {
      await t_context.authorize(startAuthApiUrl, { height: 680, width: 580, validToken: () => false });
      t_context.alert({ message: 'Proces autoryzacji Trello zakończony. Spróbuj ponownie zapisać.', duration: 6 });
      if (event.source) {
        event.source.postMessage({ type: 'trelloAuthFlowCompleted' }, KAMAN_APP_URL);
      }
    } catch (authError) {
      console.error('Trello authorization failed when initiated from popup:', authError);
      t_context.alert({ message: 'Autoryzacja Trello nie powiodła się.', duration: 5, display: 'error' });
      if (event.source) {
        event.source.postMessage({ type: 'trelloAuthFlowFailed' }, KAMAN_APP_URL);
      }
    }
  } else if (eventData && eventData.type === 'requestTrelloTokens') {
     if (!t_context) {
      console.error('Nie można pobrać tokenów: brak kontekstu Trello.');
       if (event.source) {
         event.source.postMessage({ type: 'trelloTokensResponse', tokens: null, error: 'Brak kontekstu Trello w main.js' }, KAMAN_APP_URL);
       }
      return;
    }
    const tokens = await getStoredTokens(t_context); // Użyj kontekstu t_context
    if (event.source) {
      if (tokens && tokens.accessToken) {
        event.source.postMessage({ type: 'trelloTokensResponse', tokens: tokens }, KAMAN_APP_URL);
      } else {
        event.source.postMessage({ type: 'trelloTokensResponse', tokens: null }, KAMAN_APP_URL);
      }
    }
  }
  // Usunięto 'trelloAuthTokensFromCallback', ponieważ callback.js powinien wywołać closeAuthorize(),
  // a logika po rozwiązaniu t.authorize() powinna obsłużyć zapis tokenów, jeśli jest to potrzebne w main.js.
});