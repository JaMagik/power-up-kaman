// Plik: main.js (dla projektu Power-Upa na GitHub: JaMagik/power-up-kaman)

console.log('Power-Up main.js ŁADOWANY - Wersja bazująca na działającym kodzie użytkownika');

const TRELLO_APP_NAME_FOR_AUTHORIZE = 'Generuj ofertę Kaman'; // Nazwa wyświetlana użytkownikowi podczas okna zgody Trello

TrelloPowerUp.initialize({
  'card-buttons': function(t_button_capability, options) { // 't_button_capability' to kontekst dla zdolności card-buttons
    console.log('Power-Up: Funkcja card-buttons została wywołana.');
    try {
      return [{
        icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg',
        text: 'Generuj Ofertę Kaman', // Tekst na przycisku
        callback: function(t_button_context) { // 't_button_context' to kontekst dla tego konkretnego przycisku
          console.log('Power-Up: Przycisk "Generuj Ofertę Kaman" został kliknięty.');

          // Krok 1: Autoryzacja użytkownika w Trello
          // Używamy kontekstu przycisku (t_button_context) do wywołania authorize
          return t_button_context.getRestApi()
            .authorize({
              scope: 'read,write',
              expiration: '1day',
              name: TRELLO_APP_NAME_FOR_AUTHORIZE
            })
            .then(function(token) {
              console.log('Power-Up: Autoryzacja Trello zakończona. Uzyskany token (początek):', token ? token.substring(0, 10) + '...' : 'BRAK TOKENA');

              if (!token) {
                console.error("Power-Up: Token nie został uzyskany po autoryzacji. Użytkownik mógł anulować.");
                // Można tu dodać powiadomienie dla użytkownika, np. t_button_context.alert({...})
                throw new Error("Autoryzacja nieudana - token nie został zwrócony."); // Ważne, aby rzucić błąd, aby .catch zadziałał
              }

              // Krok 2: Pomyślna autoryzacja - mamy token. Pobieramy dane karty.
              // Używamy kontekstu przycisku (t_button_context) do pobrania danych karty
              return t_button_context.card('id', 'name')
                .then(function(card) {
                  console.log('Power-Up: Pomyślnie pobrano dane karty:', card);
                  const cardId = card.id;
                  
                  // Krok 3: Konstrukcja URL-a do Twojej aplikacji React
                  // Użyj poprawnego URL-a Twojej aplikacji ofertowej
                  const reactAppUrl = `https://kaman-oferty-trello.vercel.app/?trelloCardId=${cardId}&trelloToken=${token}`;
                  console.log("Power-Up: Przygotowuję otwarcie popupu z URL:", reactAppUrl);

                  // Krok 4: Otwarcie Twojej aplikacji React w popupie Trello
                  // Używamy kontekstu przycisku (t_button_context) do otwarcia popupu
                  return t_button_context.popup({
                    title: 'Generator Ofert Kaman',
                    url: reactAppUrl,
                    height: 750,
                    width: 800
                  });
                });
            })
            .catch(function(error) {
              console.error("Power-Up: Wystąpił błąd w procesie (autoryzacja, pobieranie karty lub otwieranie popupu):", error);
              // Można tu powiadomić użytkownika o błędzie, np.
              // t_button_context.alert({ message: 'Wystąpił błąd: ' + error.message, duration: 10, display: 'error' });
            });
        }
      }];
    } catch (e) {
      console.error('Power-Up: Wystąpił krytyczny błąd podczas definiowania tablicy card-buttons:', e);
      return []; // Zwróć pustą tablicę w razie błędu, aby Trello nie "wykrzaczyło" całego Power-Upa
    }
  }
});

console.log('Power-Up main.js - Inicjalizacja TrelloPowerUp zakończona.');