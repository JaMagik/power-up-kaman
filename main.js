// main.js - KROK 1: Przywracanie popupu

// Upewnij się, że ta stała jest poprawna! Zastąp <TWOJA_RZECZYWISTA_NAZWA_APLIKACJI>
const KAMAN_APP_URL = 'https://kaman-oferty-trello.vercel.app/';
// const KAMAN_APP_URL = 'http://localhost:5173'; // Jeśli testujesz lokalnie z Vite

console.log('START: main.js Power-Up skrypt ładowany');

try {
  TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
      console.log('SUCCESS: card-buttons capability wywołana. Kontekst t:', t);
      try {
        return [{
          icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg', // Zmieniona ikona na Twoją
          text: 'Generuj ofertę Kaman', // Zmieniony tekst na Twój
          callback: function(t_button_context) {
            console.log('SUCCESS: Callback "Generuj ofertę Kaman" wywołany. Kontekst t_button_context:', t_button_context);
            try {
              return t_button_context.card('id', 'name')
                .then(function(card) {
                  const cardId = card.id;
                  const url = `${KAMAN_APP_URL}/?trelloCardId=${cardId}`; // Użyj URL-a Twojej aplikacji
                  // const url = 'https://www.example.com'; // Alternatywnie, na początek bardzo prosty URL
                  
                  console.log('Próba otwarcia popupu z URL:', url);
                  
                  // Zapisz kontekst 't', aby listener 'message' mógł go potencjalnie użyć
                  // To jest nadal obejście, ale może być potrzebne
                  window.currentTrelloContext = t_button_context; 
                  window.currentCardId = cardId; // Zapisz też cardId, jeśli listener go potrzebuje

                  return t_button_context.popup({
                    title: 'Generator Ofert Kaman',
                    url: url,
                    height: 750, // Wysokość, której używałeś
                    args: { // Przekaż argumenty, Twoja aplikacja w popupie może je odczytać przez t.arg('cardId')
                        cardId: cardId,
                        KAMAN_APP_URL: KAMAN_APP_URL // Możesz przekazać URL, jeśli jest potrzebny w popupie
                    }
                  });
                })
                .catch(function(error) {
                  console.error('ERROR: Błąd w callbacku podczas pobierania danych karty lub otwierania popupu:', error);
                  t_button_context.alert({
                    message: `Błąd otwierania popupu: ${error.message || error}`,
                    duration: 5,
                    display: 'error'
                  });
                });
            } catch (callbackError) {
              console.error('ERROR: Krytyczny błąd wewnątrz callbacku "Generuj ofertę Kaman":', callbackError);
              // Spróbuj wyświetlić alert Trello, jeśli t_button_context jest dostępne
              if (t_button_context && t_button_context.alert) {
                t_button_context.alert({ message: 'Wystąpił krytyczny błąd w callbacku.', duration: 5, display: 'error' });
              }
            }
          }
        }];
      } catch (capabilityError) {
        console.error('ERROR: Krytyczny błąd podczas definiowania capabilities (np. card-buttons):', capabilityError);
        return [];
      }
    }
  });
  console.log('SUCCESS: TrelloPowerUp.initialize zostało wywołane bez rzucenia błędu.');
} catch (initError) {
  console.error('ERROR: Krytyczny błąd podczas TrelloPowerUp.initialize:', initError);
}

// Na razie zostaw zakomentowany globalny listener wiadomości
/*
console.log('Próba dodania globalnego listenera wiadomości');
try {
  window.addEventListener('message', async (event) => {
    console.log('Odebrano wiadomość w globalnym listenerze:', event.data);
    // Tutaj byłaby bardziej złożona logika, ale na razie ją pomijamy
  });
  console.log('SUCCESS: Globalny listener wiadomości dodany.');
} catch (listenerError) {
  console.error('ERROR: Błąd podczas dodawania globalnego listenera wiadomości:', listenerError);
}
*/
console.log('END: main.js Power-Up skrypt zakończył ładowanie.');