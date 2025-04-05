document.addEventListener('DOMContentLoaded', () => {
    const checkoutItems = document.getElementById('checkoutItems');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const totalElement = document.getElementById('total');
    const paymentDetails = document.getElementById('paymentDetails');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const shippingCost = 5.00;

    // Load and verify cart items with loading state
    async function loadCheckoutItems() {
        const savedCart = localStorage.getItem('cart');
        if (!savedCart) {
            window.location.href = 'products.html';
            return;
        }

        // Show loading
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying cart...';
        checkoutItems.appendChild(loadingIndicator);

        try {
            const cart = JSON.parse(savedCart);
            const verification = await fetch('http://localhost:5000/api/cart/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart })
            });

            const { valid, cart: verifiedCart } = await verification.json();
            
            if (!valid) {
                localStorage.setItem('cart', JSON.stringify(verifiedCart));
                alert('Some items were adjusted due to stock changes. Please review your order.');
                window.location.reload();
                return;
            }

            renderCartItems(verifiedCart);
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Error verifying your cart. Please try again.');
        } finally {
            loadingIndicator.remove();
        }
    }

    // Render cart items
    function renderCartItems(cart) {
        checkoutItems.innerHTML = cart.map(item => `
            <div class="checkout-item">
                <img src="${item.image}" alt="${item.name}" class="checkout-item-image">
                <div class="checkout-item-details">
                    <h4>${item.name}</h4>
                    <p>Quantity: ${item.quantity}</p>
                    <p>₹${(item.price * item.quantity).toFixed(2)}</p>
                </div>
            </div>
        `).join('');

        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const total = subtotal + shippingCost;

        subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
        shippingElement.textContent = `₹${shippingCost.toFixed(2)}`;
        totalElement.textContent = `₹${total.toFixed(2)}`;
    }

    // Payment method handling
    document.querySelectorAll('input[name="payment"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const paymentMethod = e.target.value;
            
            switch(paymentMethod) {
                case 'upi':
                    paymentDetails.innerHTML = `
                        <div class="payment-form">
                            <div class="form-group">
                                <label for="upiId">UPI ID</label>
                                <input type="text" id="upiId" required placeholder="username@bank">
                            </div>
                            <div class="form-group">
                                <label for="upiName">Name</label>
                                <input type="text" id="upiName" required>
                            </div>
                        </div>
                    `;
                    break;
                case 'card':
                    paymentDetails.innerHTML = `
                        <div class="payment-form">
                            <div class="form-group">
                                <label for="cardNumber">Card Number</label>
                                <input type="text" id="cardNumber" required placeholder="1234 5678 9012 3456" pattern="[0-9]{16}" maxlength="16">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="expiry">Expiry</label>
                                    <input type="text" id="expiry" required placeholder="MM/YY" pattern="(0[1-9]|1[0-2])\/[0-9]{2}">
                                </div>
                                <div class="form-group">
                                    <label for="cvv">CVV</label>
                                    <input type="text" id="cvv" required placeholder="123" pattern="[0-9]{3,4}" maxlength="4">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="cardName">Name on Card</label>
                                <input type="text" id="cardName" required>
                            </div>
                        </div>
                    `;
                    break;
                case 'cod':
                    paymentDetails.innerHTML = `
                        <div class="payment-form">
                            <p>Pay with cash upon delivery.</p>
                            <div class="form-group">
                                <label for="address">Delivery Address</label>
                                <textarea id="address" required rows="4"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="phone">Phone</label>
                                <input type="tel" id="phone" required pattern="[0-9]{10}" maxlength="10">
                            </div>
                        </div>
                    `;
                    break;
            }
        });
    });

    // Payment validation
    function validatePayment(method) {
        switch(method) {
            case 'upi':
                return document.getElementById('upiId').value && 
                       document.getElementById('upiName').value;
            case 'card':
                return document.getElementById('cardNumber').value &&
                       document.getElementById('expiry').value &&
                       document.getElementById('cvv').value &&
                       document.getElementById('cardName').value;
            case 'cod':
                return document.getElementById('address').value &&
                       document.getElementById('phone').value;
            default:
                return false;
        }
    }

    // Order submission
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async () => {
            const selectedPayment = document.querySelector('input[name="payment"]:checked');
            
            if (!selectedPayment) {
                alert('Please select a payment method');
                return;
            }

            if (!validatePayment(selectedPayment.value)) {
                alert('Please fill all required payment details');
                return;
            }

            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const paymentInfo = getPaymentInfo(selectedPayment.value);
                
                const response = await fetch('https://green-market-9tq6.onrender.com/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cart.map(item => ({
                            id: item.id,
                            quantity: item.quantity
                        })),
                        paymentMethod: selectedPayment.value,
                        paymentInfo: paymentInfo
                    })
                });
                

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Checkout failed');
                }

                const result = await response.json();
                showOrderConfirmation(result, cart);
                localStorage.removeItem('cart');

            } catch (error) {
                console.error('Checkout error:', error);
                alert(`Payment failed: ${error.message}`);
            } finally {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Place Order';
            }
        });
    }

    // Show confirmation
    function showOrderConfirmation(order, cartItems) {
        checkoutItems.innerHTML = `
            <div class="confirmation-message">
                <i class="fas fa-check-circle"></i>
                <h3>Order #${order.orderId}</h3>
                <p class="order-date">${new Date(order.timestamp).toLocaleString()}</p>
                
                <div class="order-summary">
                    ${cartItems.map(item => `
                        <div class="order-item">
                            <img src="${item.image}" alt="${item.name}">
                            <div>
                                <h4>${item.name}</h4>
                                <p>${item.quantity} × ₹${item.price.toFixed(2)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="order-totals">
                    <p>Subtotal: ₹${cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</p>
                    <p>Shipping: ₹${shippingCost.toFixed(2)}</p>
                    <p class="total">Total: ₹${(cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + shippingCost).toFixed(2)}</p>
                </div>
                
                <p class="thank-you">Thank you for your purchase!</p>
                <a href="products.html" class="btn">Continue Shopping</a>
            </div>
        `;
        document.querySelector('.payment-section').style.display = 'none';
    }

    // Get payment info
    function getPaymentInfo(method) {
        switch(method) {
            case 'upi':
                return {
                    upiId: document.getElementById('upiId').value.trim(),
                    upiName: document.getElementById('upiName').value.trim()
                };
            case 'card':
                return {
                    cardNumber: document.getElementById('cardNumber').value.replace(/\s/g, ''),
                    expiry: document.getElementById('expiry').value.trim(),
                    cvv: document.getElementById('cvv').value.trim(),
                    cardName: document.getElementById('cardName').value.trim()
                };
            case 'cod':
                return {
                    address: document.getElementById('address').value.trim(),
                    phone: document.getElementById('phone').value.trim()
                };
            default:
                return {};
        }
    }

    // Initialize
    loadCheckoutItems();
});