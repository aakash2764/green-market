// Cart functionality
let cart = [];
let productsCache = []; // Cache for product data including stock

// Load cart from localStorage
async function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        await verifyCartStock(); // Verify stock on load
        updateCartCount();
        updateCartDisplay();
    }
}

// Fetch product data including stock from API
async function fetchProductData(productId) {
    try {
        const response = await fetch(`https://green-market-9tq6.onrender.com/api/products/${productId}`);
        if (!response.ok) throw new Error('Product not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

// Verify all items in cart against current stock
async function verifyCartStock() {
    const verifiedCart = [];
    
    for (const item of cart) {
        const product = await fetchProductData(item.id);
        if (product && product.stock > 0) {
            const availableQty = Math.min(item.quantity, product.stock);
            if (availableQty > 0) {
                verifiedCart.push({
                    ...item,
                    quantity: availableQty
                });
            }
        }
    }
    
    cart = verifiedCart;
    saveCart();
}

// Add item to cart with stock check
async function addToCart(productId) {
    try {
        // 1. Get current product data from API
        const product = await fetchProductData(productId);
        if (!product || product.stock <= 0) {
            showNotification('This item is out of stock');
            return;
        }

        // 2. Check how many we already have in cart
        const existingItem = cart.find(item => item.id === productId);
        const currentQty = existingItem ? existingItem.quantity : 0;
        
        // 3. Check if we can add more
        if (currentQty >= product.stock) {
            showNotification(`Only ${product.stock} available (already in cart)`);
            return;
        }

        // 4. Update cart
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image,
                maxStock: product.stock // Store for client-side reference
            });
        }
        
        saveCart();
        showNotification(`${product.name} added to cart`);
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add item to cart');
    }
}

// Update item quantity with stock check
async function updateQuantity(productId, newQuantity) {
    try {
        // Get current stock
        const product = await fetchProductData(productId);
        if (!product) {
            showNotification('Product not available');
            removeFromCart(productId);
            return;
        }

        newQuantity = Math.max(0, Math.min(newQuantity, product.stock));
        
        const item = cart.find(item => item.id === productId);
        if (item) {
            if (newQuantity === 0) {
                removeFromCart(productId);
            } else {
                item.quantity = newQuantity;
                item.maxStock = product.stock; // Update stock reference
                saveCart();
            }
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        showNotification('Failed to update quantity');
    }
}

// Remove item from cart (unchanged)
function removeFromCart(productId) {
    const index = cart.findIndex(item => item.id === productId);
    if (index !== -1) {
        cart.splice(index, 1);
        saveCart();
    }
}

// Update cart display to show stock limits
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>₹${item.price.toFixed(2)}</p>
                <div class="quantity-controls">
                    <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})" 
                            ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span>${item.quantity} / ${item.maxStock || '?'}</span>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})"
                            ${item.quantity >= (item.maxStock || Infinity) ? 'disabled' : ''}>+</button>
                </div>
            </div>
            <button class="remove-item" onclick="removeFromCart(${item.id})">×</button>
        </div>
    `).join('');

    document.getElementById('cartTotal').textContent = calculateTotal().toFixed(2);
}

// Rest of your existing functions remain the same:
function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = totalItems);
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    updateCartDisplay();
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialize with async load
document.addEventListener('DOMContentLoaded', () => {
    loadCart(); // Now async
    
    const cartIcon = document.getElementById('cartIcon');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    const checkoutButton = document.getElementById('checkoutButton');

    if (cartIcon && cartSidebar && closeCart) {
        cartIcon.addEventListener('click', () => cartSidebar.classList.add('active'));
        closeCart.addEventListener('click', () => cartSidebar.classList.remove('active'));
    }

    if (checkoutButton) {
        checkoutButton.addEventListener('click', () => {
            if (cart.length > 0) {
                window.location.href = 'checkout.html';
            } else {
                showNotification('Your cart is empty');
            }
        });
    }
});