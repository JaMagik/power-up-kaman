// Plik: main.js (dla projektu Power-Upa)

console.log('Power-Up main.js ŁADOWANY - Wersja dla poprawnej autoryzacji');

// Stała definiująca nazwę Twojej aplikacji/Power-Upa, która będzie widoczna dla użytkownika podczas autoryzacji.
// Możesz ją dostosować, np. usunąć spacje, jeśli wolisz, ale ze spacjami też powinno działać.
const TRELLO_APP_NAME = 'Generuj ofertę Kaman';

// Inicjalizacja Power-Upa
TrelloPowerUp.initialize({
  // Definicja przycisków na karcie
  'card-buttons': function(t, options) {
    console.log('Power-Up: Funkcja card-buttons została wywołana.');
    try {
      return [{
        icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg', // Upewnij się, że ten URL ikony działa
        text: 'Generuj Ofertę Kaman', // Tekst na przycisku
        callback: function(t_button_context) { // Kontekst Trello dla tego konkretnego przycisku
          console.log('Power-Up: Przycisk "Generuj Ofertę Kaman" został kliknięty.');

          // Krok 1: Autoryzacja użytkownika w Trello
          return t_button_context.getRestApi()
            .authorize({
              scope: 'read,write',    // Zakres uprawnień: odczyt i zapis
              expiration: '1day',     // Czas ważności tokena (np. 1 dzień, 30days, never)
              name: TRELLO_APP_NAME   // Nazwa Twojej aplikacji wyświetlana użytkownikowi
            })
            .then(function(token) {
              // Krok 2: Pomyślna autoryzacja - mamy token
              console.log('Power-Up: Autoryzacja Trello zakończona sukcesem. Uzyskany token (początek):', token ? token.substring(0, 10) + '...' : 'BRAK TOKENA');

              if (!token) {
                console.error("Power-Up: Token nie został uzyskany po autoryzacji. Użytkownik mógł anulować.");
                // Możesz tu wyświetlić powiadomienie dla użytkownika, jeśli chcesz
                // np. t_button_context.alert({ message: 'Autoryzacja Trello została anulowana lub nie powiodła się.', duration: 6 });
                throw new Error("Autoryzacja nieudana - token nie został zwrócony.");
              }

              // Krok 3: Pobranie danych karty (ID i nazwy)
              return t_button_context.card('id', 'name')
                .then(function(card) {
                  console.log('Power-Up: Pomyślnie pobrano dane karty:', card);
                  const cardId = card.id;
                  
                  // Krok 4: Konstrukcja URL-a do Twojej aplikacji React z przekazaniem cardId i tokena
                  const reactAppUrl = `https://kaman-oferty-trello.vercel.app/?trelloCardId=${cardId}&trelloToken=${token}`;
                  console.log("Power-Up: Przygotowuję otwarcie popupu z URL:", reactAppUrl);

                  // Krok 5: Otwarcie Twojej aplikacji React w popupie Trello
                  return t_button_context.popup({
                    title: 'Generator Ofert Kaman', // Tytuł okna popup
                    url: reactAppUrl,               // URL Twojej aplikacji React
                    height: 750,                    // Sugerowana wysokość popupu w pikselach
                    width: 800                      // Sugerowana szerokość popupu w pikselach
                  });
                });
            })
            .catch(function(error) {
              // Obsługa błędów, które mogły wystąpić podczas autoryzacji lub pobierania danych karty
              console.error("Power-Up: Wystąpił błąd w procesie autoryzacji lub pobierania danych karty:", error);
              // Możesz tu wyświetlić powiadomienie dla użytkownika o błędzie
              // np. t_button_context.alert({ message: 'Wystąpił błąd: ' + error.message, duration: 10 });
            });
        }
      }];
    } catch (e) {
      console.error('Power-Up: Wystąpił krytyczny błąd podczas definiowania card-buttons:', e);
      return []; // Zwróć pustą tablicę, aby Trello nie wyświetliło błędu krytycznego Power-Upa
    }
  }
});

console.log('Power-Up main.js - Inicjalizacja TrelloPowerUp zakończona.');