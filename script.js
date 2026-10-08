// Supabase 대시보드의 프로젝트 URL과 anon/publishable 키를 입력하세요.
const SUPABASE_URL = 'https://xnruoywcyraqqrnvrmzz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucnVveXdjeXJhcXFybnZybXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MjQ2MDAsImV4cCI6MjEwNzAwMDYwMH0.5YyIN_yKauJQqgWPghxTCSdFf0BLz1IKvbaELKUg2BQ';

// CDN이 정상적으로 로드되면 Supabase 클라이언트를 만듭니다.
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY) ?? null;

// 주문서에서 필요한 HTML 요소를 ID로 찾아 변수에 저장합니다.
const orderForm = document.getElementById('order-form');
const submitButton = orderForm.querySelector('button[type="submit"]');
const customerNameInput = document.getElementById('customer-name');
const phoneInput = document.getElementById('phone');
const drinkSelect = document.getElementById('drink');
const quantityInput = document.getElementById('quantity');
const estimatedPrice = document.getElementById('estimated-price');
const orderConfirmation = document.getElementById('order-confirmation');
const orderTabButton = document.getElementById('tab-order');
const historyTabButton = document.getElementById('tab-history');
const orderPanel = document.getElementById('order-panel');
const historyPanel = document.getElementById('history-panel');
const orderCount = document.getElementById('order-count');
const ordersList = document.getElementById('orders-list');
const ordersTotal = document.getElementById('orders-total');
const clearOrdersButton = document.getElementById('clear-orders');

// 접수된 주문을 저장할 배열입니다. 새 주문은 배열의 맨 앞에 추가합니다.
let orders = [];
let nextOrderNumber = 1;
let keepConfirmationAfterReset = false;

// 현재 선택한 음료, 사이즈, 추가 옵션과 수량을 읽어 총액을 계산합니다.
// 음료를 고르지 않았다면 다른 항목과 관계없이 금액은 0원입니다.
function calculateTotal() {
  const selectedDrink = drinkSelect.selectedOptions[0];

  if (!drinkSelect.value) {
    return 0;
  }

  const drinkPrice = Number(selectedDrink.dataset.price) || 0;
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizePrice = selectedSize ? Number(selectedSize.dataset.price) || 0 : 0;
  const selectedOptions = document.querySelectorAll('input[name="options"]:checked');

  // 선택된 추가 옵션의 가격을 하나씩 더합니다.
  let optionsPrice = 0;
  selectedOptions.forEach((option) => {
    optionsPrice += Number(option.dataset.price) || 0;
  });

  // 수량을 읽고, 입력 중 값이 비어 있거나 범위를 벗어나면 1~10으로 제한합니다.
  const enteredQuantity = Number(quantityInput.value) || 1;
  const quantity = Math.min(10, Math.max(1, enteredQuantity));

  return (drinkPrice + sizePrice + optionsPrice) * quantity;
}

// calculateTotal()에서 계산한 금액을 주문서에 천 단위 콤마와 함께 표시합니다.
function updateEstimatedPrice() {
  const total = calculateTotal();
  estimatedPrice.textContent = `예상 금액: ${total.toLocaleString('ko-KR')}원`;
}

// 음료, 사이즈, 옵션, 수량을 바꾸면 예상 금액을 바로 다시 계산합니다.
orderForm.addEventListener('input', updateEstimatedPrice);
orderForm.addEventListener('change', updateEstimatedPrice);

// 브라우저 기본 초기화가 끝난 뒤 금액을 갱신합니다.
// 직접 다시 작성할 때는 확인 문구를 지우고, 주문 직후에는 문구를 남깁니다.
orderForm.addEventListener('reset', () => {
  window.setTimeout(() => {
    updateEstimatedPrice();
    if (!keepConfirmationAfterReset) {
      orderConfirmation.textContent = '';
      orderConfirmation.hidden = true;
    }
    keepConfirmationAfterReset = false;
  }, 0);
});

// 탭 버튼을 누르면 해당 화면만 보이도록 hidden 클래스를 바꿉니다.
function showTab(selectedTab) {
  const showOrderForm = selectedTab === 'order';

  orderPanel.classList.toggle('hidden', !showOrderForm);
  historyPanel.classList.toggle('hidden', showOrderForm);
  orderTabButton.classList.toggle('active', showOrderForm);
  historyTabButton.classList.toggle('active', !showOrderForm);
  orderTabButton.setAttribute('aria-selected', String(showOrderForm));
  historyTabButton.setAttribute('aria-selected', String(!showOrderForm));
}

orderTabButton.addEventListener('click', () => showTab('order'));
historyTabButton.addEventListener('click', () => showTab('history'));

// 시럽 옵션의 체크박스와 라벨에 마우스를 올리면 안내 문구가 보입니다.
document.getElementById('extra-syrup').title = '바닐라 시럽';
document.querySelector('label[for="extra-syrup"]').title = '바닐라 시럽';

// 주문 배열을 화면에 카드로 그리며 건수와 전체 금액도 함께 갱신합니다.
function renderOrders() {
  ordersList.replaceChildren();
  orderCount.textContent = String(orders.length);

  if (orders.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-orders';
    emptyMessage.textContent = '아직 주문 내역이 없어요 ☕';
    ordersList.append(emptyMessage);
  } else {
    orders.forEach((order) => {
      const card = document.createElement('article');
      card.className = 'order-card';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'order-card-header';

      const primaryLine = document.createElement('p');
      primaryLine.className = 'order-card-primary';
      primaryLine.textContent = `#${order.number} ${order.name}님 · ${order.total.toLocaleString('ko-KR')}원`;

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'cancel-order';
      cancelButton.dataset.orderNumber = String(order.number);
      cancelButton.textContent = '취소';
      cardHeader.append(primaryLine, cancelButton);

      const detailLine = document.createElement('p');
      detailLine.className = 'order-card-detail';
      const optionText = order.options.length > 0 ? ` (${order.options.join(', ')})` : '';
      detailLine.textContent = `${order.drink} ${order.size}사이즈${optionText} ${order.quantity}잔`;

      const metaLine = document.createElement('p');
      metaLine.className = 'order-card-meta';
      metaLine.textContent = order.request
        ? `${order.request} · ${order.orderedAt}`
        : order.orderedAt;

      card.append(cardHeader, detailLine, metaLine);
      ordersList.append(card);
    });
  }

  // 취소된 주문은 합계에서 빠지도록 현재 배열의 주문만 더합니다.
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
  ordersTotal.textContent = `총 주문 금액: ${totalAmount.toLocaleString('ko-KR')}원 (${orders.length}건)`;
  clearOrdersButton.disabled = orders.length === 0;
}

// 카드 안의 취소 버튼을 확인하고 해당 주문을 목록에서 지웁니다.
ordersList.addEventListener('click', (event) => {
  const cancelButton = event.target.closest('.cancel-order');

  if (!cancelButton) {
    return;
  }

  const orderNumber = Number(cancelButton.dataset.orderNumber);

  if (confirm(`주문 #${orderNumber}을(를) 취소하시겠어요?`)) {
    orders = orders.filter((order) => order.number !== orderNumber);
    renderOrders();
  }
});

// 모든 내역을 한 번 더 확인한 뒤 비웁니다.
clearOrdersButton.addEventListener('click', () => {
  if (orders.length === 0 || !confirm('주문 내역을 모두 지울까요?')) {
    return;
  }

  orders = [];
  renderOrders();
});

// 주문하기를 누르면 입력값을 확인한 뒤 주문 확인 문구를 표시합니다.
orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const customerName = customerNameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!customerName) {
    alert('이름을 입력해주세요');
    customerNameInput.focus();
    return;
  }

  if (!phone) {
    alert('전화번호를 입력해주요');
    phoneInput.focus();
    return;
  }

  if (!drinkSelect.value) {
    alert('음료를 선택해주세요');
    drinkSelect.focus();
    return;
  }

  const selectedDrink = drinkSelect.selectedOptions[0];
  const drinkName = selectedDrink.textContent.replace(/\s[\d,]+원$/, '');
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizeName = selectedSize ? selectedSize.value : 'M';
  const selectedOptions = document.querySelectorAll('input[name="options"]:checked');
  const optionNames = Array.from(selectedOptions, (option) => {
    return document.querySelector(`label[for="${option.id}"]`).textContent
      .replace(/\s*\+?[\d,]+원$/, '')
      .trim();
  });
  const optionText = optionNames.length > 0 ? ` (${optionNames.join(', ')})` : '';
  const quantity = Math.min(10, Math.max(1, Number(quantityInput.value) || 1));
  const total = calculateTotal();
  const request = document.getElementById('request').value.trim();
  const order = {
    number: nextOrderNumber,
    name: customerName,
    drink: drinkName,
    size: sizeName,
    options: optionNames,
    quantity,
    request,
    total,
    orderedAt: new Date().toLocaleString('ko-KR'),
  };

  // 데이터베이스에 저장할 열 이름을 Supabase 테이블과 맞춥니다.
  const databaseOrder = {
    customer_name: customerName,
    phone,
    drink: drinkName,
    size: sizeName,
    options: optionNames,
    quantity,
    request,
    amount: total,
  };

  // 저장 중에는 버튼을 잠가 중복 주문이 들어가는 것을 막습니다.
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = '저장 중...';

  try {
    if (!supabaseClient) {
      throw new Error('Supabase CDN을 불러오지 못했습니다.');
    }

    // insert가 오류 없이 끝났을 때만 주문 접수를 완료 처리합니다.
    const { error } = await supabaseClient.from('orders').insert(databaseOrder);

    if (error) {
      throw error;
    }

    nextOrderNumber += 1;
    orders.unshift(order);
    renderOrders();

    // textContent를 사용해 이름과 주문 내용을 안전하게 화면에 넣습니다.
    orderConfirmation.textContent = `${customerName}님, ${drinkName} ${sizeName}사이즈${optionText} ${quantity}잔, 총 ${total.toLocaleString('ko-KR')}원 주문이 접수되었습니다!`;
    orderConfirmation.hidden = false;

    // 주문 정보는 이미 Supabase와 orders 배열에 저장했으므로 입력 폼만 초기화합니다.
    keepConfirmationAfterReset = true;
    orderForm.reset();
  } catch (error) {
    console.error('주문 저장 중 오류가 발생했습니다:', error);
    alert('주문 저장에 실패했어요');
  } finally {
    // 저장이 성공하거나 실패해도 버튼을 다시 사용할 수 있게 합니다.
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});

// 페이지를 열었을 때도 예상 금액이 올바르게 보이도록 한 번 계산합니다.
updateEstimatedPrice();
renderOrders();