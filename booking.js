(() => {
  const form = document.querySelector('.booking-form');
  if (!form) return;
  const arrival = form.elements.arrival;
  const departure = form.elements.departure;
  const output = document.querySelector('.booking-feedback');
  const localDate = date => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
  arrival.min = localDate(new Date());
  const updateDeparture = () => {
    if (!arrival.value) return;
    const next = new Date(arrival.value + 'T12:00:00');
    next.setDate(next.getDate() + 1);
    departure.min = localDate(next);
    if (departure.value && departure.value < departure.min) departure.value = '';
  };
  arrival.addEventListener('change', updateDeparture);
  form.addEventListener('submit', event => {
    event.preventDefault();
    updateDeparture();
    if (!form.reportValidity()) return;
    const format = value => new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'long', year:'numeric' }).format(new Date(value + 'T12:00:00'));
    const message = document.createElement('span');
    message.textContent = 'Даты: ' + format(arrival.value) + ' — ' + format(departure.value) + ', гостей: ' + form.elements.guests.value + '. Уточните наличие по телефону: ';
    const phone = document.createElement('a');
    phone.href = 'tel:+79601600524';
    phone.textContent = '+7 (960) 160-05-24';
    output.replaceChildren(message, phone);
    output.hidden = false;
  });
})();
