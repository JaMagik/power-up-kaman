// main.js - SUPER UPROSZCZONA WERSJA DO DIAGNOZY

// Upewnij się, że ta stała jest poprawna, jeśli jej używasz. Na razie ją zakomentuję.
// const KAMAN_APP_URL = 'https://<TWOJA_RZECZYWISTA_NAZWA_APLIKACJI>.vercel.app';

console.log('START: main.js Power-Up skrypt ładowany');

try {
  TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
      console.log('SUCCESS: card-buttons capability wywołana. Kontekst t:', t);
      try {
        return [{
          icon: 'https://cdn.glitch.com/2442c68d-7b6d-4b69-9d13-fe4fCa80600A%2Fglitch-icon.svg?1489762220922', // Publicznie dostępna ikona
          text: 'Testowy Przycisk',
          callback: function(t_button_context) { // 't_button_context' to kontekst dla tego konkretnego przycisku
            console.log('SUCCESS: Callback Testowego Przycisku wywołany. Kontekst t_button_context:', t_button_context);
            try {
              t_button_context.alert({
                message: 'Testowy przycisk działa!',
                duration: 5,
                display: 'success'
              });
              // Na razie nie otwieramy żadnego popupu, tylko testujemy, czy przycisk i alert działają.
              // Jeśli chcesz przetestować otwieranie popupu (po upewnieniu się, że przycisk działa):
              /*
              return t_button_context.card('id', 'name')
                .then(function(card) {
                  const cardId = card.id;
                  // Zastąp poprawnym URL-em, jeśli chcesz testować popup
                  // const url = `${KAMAN_APP_URL}/?trelloCardId=${cardId}&test=true`;
                  const placeholderUrl = 'https://www.example.com'; // Użyj prostego, działającego URL do testu
                  console.log('Próba otwarcia popupu z URL:', placeholderUrl);
                  return t_button_context.popup({
                    title: 'Testowy Popup',
                    url: placeholderUrl,
                    height: 350
                  });
                })
                .catch(function(error) {
                  console.error('ERROR: Błąd w callbacku Testowego Przycisku podczas pobierania danych karty lub otwierania popupu:', error);
                  t_button_context.alert({
                    message: `Błąd otwierania popupu: ${error.message}`,
                    duration: 5,
                    display: 'error'
                  });
                });
              */
              return t_button_context.Promise.resolve(); // Zwróć rozwiązaną obietnicę, jeśli nie otwierasz popupu
            } catch (callbackError) {
              console.error('ERROR: Krytyczny błąd wewnątrz callbacku Testowego Przycisku:', callbackError);
            }
          }
        }];
      } catch (capabilityError) {
        console.error('ERROR: Krytyczny błąd podczas definiowania capabilities (np. card-buttons):', capabilityError);
        return []; // Zwróć pustą tablicę w razie błędu
      }
    }
    // Na razie usuń inne capabilities i listenery, aby uprościć
    // 'authorization-status': ...,
    // 'show-authorization': ...,
  });
  console.log('SUCCESS: TrelloPowerUp.initialize zostało wywołane bez rzucenia błędu.');
} catch (initError) {
  console.error('ERROR: Krytyczny błąd podczas TrelloPowerUp.initialize:', initError);
}

// Na razie zakomentuj globalny listener wiadomości, aby wyizolować problem
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