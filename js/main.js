// Initialize the application
if (typeof products !== 'undefined') { // Check if products are loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Load cart data from localStorage
        if (typeof loadCart === 'function') {
            loadCart();
        }

        // Initialize featured products on home page
        const featuredProductsContainer = document.getElementById('featuredProducts');
        if (featuredProductsContainer) {
            // Display first 3 products as featured
            const featuredProducts = products.slice(0, 4);
            featuredProductsContainer.innerHTML = featuredProducts.map(product => `
                <div class="product-card">
                    <img src="${product.image}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        <div class="product-price">₹${product.price.toFixed(2)}</div>
                        <button onclick="addToCart(${product.id})" class="add-to-cart-btn">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `).join('');
        }
    });
}