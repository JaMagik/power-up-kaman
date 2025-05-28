// W pliku main.js Twojego Power-Upa
console.log('Power-Up main.js ŁADOWANY - wersja z t.authorize');

const TRELLO_API_KEY = '0f932c28c8d97d03741c8863c2ff4afb';
const TRELLO_APP_NAME = 'Generowanie ofert'; // Możesz użyć tej nazwy

TrelloPowerUp.initialize({
  'card-buttons': function(t_button, options) { // Zmieniłem t na t_button dla jasności
    console.log('Power-Up: card-buttons capability wywołana');
    try {
      return [{
        icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg',
        text: 'Generuj Ofertę Kaman',
        callback: function(cb_t) { // Kontekst przycisku
          console.log('Power-Up: Przycisk "Generuj Ofertę Kaman" kliknięty');
          return cb_t.getRestApi()
            .authorize({
              scope: 'read,write',
              expiration: '1day',
              name: TRELLO_APP_NAME // Używamy zdefiniowanej stałej
            })
            .then(function(token) {
              console.log('Power-Up: Autoryzacja udana, token:', token);
              if (!token) {
                console.error("Power-Up: Token nie został uzyskany po autoryzacji.");
                throw new Error("Autoryzacja nieudana - brak tokena.");
              }
              return cb_t.card('id', 'name')
                .then(function(card) {
                  console.log('Power-Up: Dane karty pobrane:', card);
                  const cardId = card.id;
                  const url = `https://kaman-oferty-trello.vercel.app/?trelloCardId=<span class="math-inline">\{cardId\}&trelloToken\=</span>{token}`;
                  console.log("Power-Up: Otwieram popup z URL:", url);
                  return cb_t.popup({
                    title: 'Generator Ofert Kaman',
                    url: url,
                    height: 750,
                    width: 800
                  });
                });
            })
            .catch(function(error) {
              console.error("Power-Up: Błąd w procesie autoryzacji lub otwierania popupu:", error);
              // Możesz tu powiadomić użytkownika, np.
              // cb_t.alert({ message: 'Wystąpił błąd: ' + error.message, duration: 10 });
            });
        }
      }];
    } catch (e) {
      console.error('Power-Up: Błąd w definicji card-buttons:', e);
      return []; // Zwróć pustą tablicę, aby Trello nie miało problemu
    }
  }
});
console.log('Power-Up main.js - Inicjalizacja zakończona');