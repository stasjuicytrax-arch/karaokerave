const bookingForm = document.querySelector('#booking-form');
const bookingEmail = document.querySelector('#booking-email');
const formStatus = document.querySelector('#form-status');
const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'UTC' });

bookingForm.addEventListener('input', event => {
  event.target.setCustomValidity('');
  formStatus.textContent = '';
});

bookingForm.addEventListener('submit', event => {
  event.preventDefault();
  const { name, phone, date, comment } = Object.fromEntries(new FormData(bookingForm));
  const fields = bookingForm.elements;

  if (!name.trim()) {
    fields.name.setCustomValidity('Укажите имя.');
    fields.name.reportValidity();
    return;
  }

  if (phone.replace(/\D/g, '').length < 7 || !/^[+\d\s().-]+$/.test(phone)) {
    fields.phone.setCustomValidity('Укажите номер телефона с кодом города или страны.');
    fields.phone.reportValidity();
    return;
  }

  const subject = encodeURIComponent('Караоке Рейв на мероприятии');
  const lines = [`Имя: ${name.trim()}`, `Телефон: ${phone.trim()}`];
  if (date) lines.push(`Дата мероприятия: ${dateFormat.format(fields.date.valueAsDate)}`);
  if (comment.trim()) lines.push('', comment.trim());

  formStatus.textContent = 'Отправьте письмо из почтового приложения. Если оно не открылось, напишите нам по адресу ниже.';
  window.location.href = `${bookingEmail.href}?subject=${subject}&body=${encodeURIComponent(lines.join('\r\n'))}`;
});

bookingForm.hidden = false;
