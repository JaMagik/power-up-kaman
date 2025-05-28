// W pliku main.js Twojego Power-Upa
console.log('Power-Up main.js ŁADOWANY - Test API Key');

const TRELLO_APP_NAME = 'Generuj ofertę Kaman'; // Nazwa wyświetlana użytkownikowi

TrelloPowerUp.initialize({
  'card-buttons': function(t_button_main, options) { // Zmieniona nazwa kontekstu dla przejrzystości
    console.log('Power-Up: card-buttons capability wywołana');
    try {
      return [{
        icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg',
        text: 'Test Autoryzacji',
        callback: function(t_button_callback) { // Kontekst dla konkretnego przycisku
          console.log('Power-Up: Przycisk "Test Autoryzacji" kliknięty');

          // Bezpośrednia próba autoryzacji
          return t_button_callback.getRestApi()
            .authorize({
              scope: 'read,write',
              expiration: '1day',
              name: TRELLO_APP_NAME
            })
            .then(function(token) {
              console.log('Power-Up: Autoryzacja udana, token:', token);
              if (token) {
                alert('Autoryzacja Trello zakończona sukcesem! Token: ' + token.substring(0, 10) + '...');
              } else {
                alert('Autoryzacja Trello nie powiodła się (brak tokena).');
              }
            })
            .catch(function(authorizeError) {
              console.error("Power-Up: Błąd podczas .authorize():", authorizeError);
              alert('Błąd podczas autoryzacji Trello: ' + authorizeError.message);
            });
        }
      }];
    } catch (e) {
      console.error('Power-Up: Błąd w definicji card-buttons:', e);
      return [];
    }
  }
});
console.log('Power-Up main.js - Inicjalizacja zakończona');