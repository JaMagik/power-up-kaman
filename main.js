// main.js - Wersja do obsługi t.attach()

// Upewnij się, że ta stała jest poprawna!
const KAMAN_APP_URL = 'https://<TWOJA_RZECZYWISTA_NAZWA_APLIKACJI>.vercel.app';
// const KAMAN_APP_URL = 'http://localhost:5173'; // Dla testów lokalnych

let currentTContextForPopup = null; // Zmienna do przechowywania kontekstu 't' dla operacji z popupu

console.log('START: main.js Power-Up skrypt ładowany');

TrelloPowerUp.initialize({
  'card-buttons': function(t_button_context, options) {
    console.log('SUCCESS: card-buttons capability wywołana. Kontekst t_button_context:', t_button_context);
    return [{
      icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg',
      text: 'Generuj ofertę Kaman',
      callback: function(t_cb_context) { // Kontekst 't' specyficzny dla tego wywołania
        currentTContextForPopup = t_cb_context; // Zapisz kontekst dla listenera wiadomości
        console.log('SUCCESS: Callback "Generuj ofertę Kaman" wywołany.');
        return t_cb_context.card('id', 'name')
          .then(function(card) {
            const cardId = card.id;
            const url = `<span class="math-inline">\{KAMAN\_APP\_URL\}/?trelloCardId\=</span>{cardId}`;
            console.log('Próba otwarcia popupu z URL:', url);
            return t_cb_context.popup({
              title: 'Generator Ofert Kaman',
              url: url,
              height: 750,
              args: { cardId: card.id }
            });
          })
          .catch(function(error) {
            console.error('ERROR: Błąd w callbacku card-buttons:', error);
            currentTContextForPopup.alert({ message: `Błąd: ${error.message || error}`, duration: 5, display: 'error' });
          });
      }
    }];
  }
  // Możesz dodać inne capabilities tutaj, np. autoryzacyjne, jeśli planujesz używać własnego API do innych celów
});
console.log('SUCCESS: TrelloPowerUp.initialize wywołane.');

window.addEventListener('message', async (event) => {
  console.log('Odebrano wiadomość w main.js:', event.data, 'z origin:', event.origin);

  // Proste sprawdzenie origin dla bezpieczeństwa. Dostosuj, jeśli KAMAN_APP_URL jest dynamiczny lub testujesz lokalnie.
  // if (event.origin !== KAMAN_APP_URL && !KAMAN_APP_URL.startsWith('http://localhost')) {
  //   console.warn('Odrzucono wiadomość z nieoczekiwanego źródła:', event.origin);
  //   return;
  // }

  const eventData = event.data;
  const t = currentTContextForPopup; // Użyj zapisanego kontekstu 't'

  if (!t) {
    console.warn('Brak kontekstu Trello (currentTContextForPopup) w listenerze wiadomości. Nie można wykonać operacji kontekstowych.');
    // Możesz chcieć poinformować użytkownika lub popup, że coś poszło nie tak
    if (event.source && typeof event.source.postMessage === 'function') {
         // Zakładając, że KAMAN_APP_URL jest poprawnym originem dla odpowiedzi
        event.source.postMessage({ type: 'trelloContextErrorInMainJs', message: 'Brak kontekstu Trello w Power-Upie (main.js).' }, '*');
    }
    return;
  }

  if (eventData && eventData.pdfUrl && eventData.pdfName) {
    console.log('Próba dołączenia PDF przez t.attach():', eventData.pdfName);
    try {
      // Używamy 't' (czyli currentTContextForPopup), który ma kontekst karty, z której otwarto popup
      await t.attach({
        url: eventData.pdfUrl, // To powinien być URL do pliku, np. Blob URL stworzony w UnifiedOfferForm
        name: eventData.pdfName
      });
      t.alert({ message: 'Oferta została zapisana na karcie Trello!', duration: 5, display: 'success' });
      t.closePopup(); // Zamyka popup, z którego przyszła wiadomość
    } catch (err) {
      console.error('Błąd podczas t.attach() w Trello:', err);
      t.alert({ message: `Błąd dołączania PDF: ${err.message || err}`, duration: 8, display: 'error' });
    }
  }
  // Dodaj obsługę innych typów wiadomości, np. inicjowanie autoryzacji, jeśli nadal tego potrzebujesz
  // else if (eventData && eventData.type === 'initiateTrelloAuth') { ... }
});
console.log('END: main.js Power-Up skrypt zakończył ładowanie, listener wiadomości aktywny.');