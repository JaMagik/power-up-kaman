// main.js

TrelloPowerUp.initialize({
  'card-buttons': function(t, options) {
    return [{
      icon: 'https://kaman-oferty.vercel.app/favicon.ico', // Ikona może być z Twojej głównej strony
      text: 'Generuj Ofertę Kaman',
      callback: function(t) {
        return t.card('id', 'name')
          .then(function(card) {
            // Tutaj jest logika, która otwiera Twoją GŁÓWNĄ aplikację
            const url = `https://kaman-oferty.vercel.app/?trelloCardId=${card.id}`;
            return t.popup({
              title: 'Generator Ofert Kaman',
              url: url,
              height: 600
            });
          });
      }
    }];
  }
});