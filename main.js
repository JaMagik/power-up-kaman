// W pliku main.js Twojego Power-Upa

const TRELLO_API_KEY = '0f932c28c8d97d03741c8863c2ff4afb'; // Ten sam co w React App
const TRELLO_APP_NAME = 'Generowanie Ofert'; // Lub inna nazwa, którą nadałeś

TrelloPowerUp.initialize({
  'card-buttons': function(t, options) {
    return [{
      icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg',
      text: 'Generuj Ofertę Kaman',
      callback: function(t_button) { // t_button to kontekst Trello dla tego przycisku
        return t_button.getRestApi()
          .authorize({
            scope: 'read,write', // Zakres uprawnień
            expiration: '1day'   // Czas ważności tokena
          })
          .then(function(token) {
            if (!token) {
              console.error("Autoryzacja Trello nie powiodła się lub została anulowana.");
              throw new Error("Autoryzacja nieudana.");
            }
            // Mamy token! Teraz otwieramy Twoją aplikację React z tokenem i cardId
            return t_button.card('id', 'name')
              .then(function(card) {
                const cardId = card.id;
                // UWAGA: Przekazywanie tokena w URL nie jest idealne z punktu widzenia bezpieczeństwa,
                // ale jest najprostszym sposobem komunikacji z popupem w tym scenariuszu.
                // Rozważ alternatywne metody, jeśli bezpieczeństwo jest krytyczne.
                const url = `https://kaman-oferty-trello.vercel.app/?trelloCardId=${cardId}&trelloToken=${token}`;
                
                console.log("Power-Up: Otwieram popup z URL:", url);

                return t_button.popup({
                  title: 'Generator Ofert Kaman',
                  url: url,
                  height: 750,
                  width: 800 
                });
              });
          })
          .catch(function(error) {
            console.error("Błąd podczas autoryzacji Trello lub pobierania danych karty:", error);
            // Możesz tu pokazać użytkownikowi powiadomienie o błędzie
            // np. t_button.alert({ message: 'Błąd autoryzacji Trello.', duration: 6 });
          });
      }
    }];
  }
});