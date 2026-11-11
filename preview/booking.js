const bookingForm = document.querySelector('#booking-form');
const formStatus = document.querySelector('#form-status');
const submitButton = bookingForm.querySelector('button[type="submit"]');
const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'UTC' });

bookingForm.addEventListener('input', event => {
  event.target.setCustomValidity('');
  formStatus.textContent = '';
});

bookingForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;

  const { name, phone, date, comment, site } = Object.fromEntries(new FormData(bookingForm));
  const fields = bookingForm.elements;

  if (name.trim().length < 2) {
    fields.name.setCustomValidity('Укажите имя.');
    fields.name.reportValidity();
    return;
  }

  if (phone.replace(/\D/g, '').length !== 11 || !/^[+\d\s().-]+$/.test(phone)) {
    fields.phone.setCustomValidity('Укажите полный номер телефона из 11 цифр.');
    fields.phone.reportValidity();
    return;
  }

  const lines = [];
  if (date) lines.push(`Дата мероприятия: ${dateFormat.format(fields.date.valueAsDate)}`);
  if (comment.trim()) lines.push(comment.trim());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  submitButton.disabled = true;
  formStatus.textContent = 'Отправляем заявку…';

  try {
    const response = await fetch(bookingForm.action, {
      method: bookingForm.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        site,
        form_name: 'Заказать Караоке Рейв',
        message: lines.join('\n'),
        page_url: `${location.origin}${location.pathname}#booking`,
      }),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) {
      formStatus.textContent = result.error || 'Не удалось отправить заявку. Попробуйте ещё раз.';
      return;
    }
    bookingForm.reset();
    formStatus.textContent = 'Заявка отправлена. Организатор свяжется с вами.';
  } catch {
    formStatus.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните организатору.';
  } finally {
    clearTimeout(timeout);
    submitButton.disabled = false;
  }
});

bookingForm.hidden = false;
