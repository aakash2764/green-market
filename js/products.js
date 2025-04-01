document.addEventListener('DOMContentLoaded', () => {
    const productsGrid = document.getElementById('productsGrid');
    const categoryFilters = document.getElementById('categoryFilters');
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');

    // Initialize filters
    let currentCategory = 'All';
    let maxPrice = 10000;
    let products = []; // Now we'll fetch this from API

    // ===== NEW: Fetch products from API =====
    async function fetchProducts() {
        try {
            const response = await fetch(`http://localhost:5000/api/products?timestamp=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching products:', error);
            return []; // Return empty array if API fails
        }
    }

    // ===== MODIFIED: Now async =====
    async function filterProducts() {
        if (products.length === 0) {
            products = await fetchProducts();
        }
        
        const filteredProducts = products.filter(product => {
            const matchesCategory = currentCategory === 'All' || product.category === currentCategory;
            const matchesPrice = product.price <= maxPrice;
            return matchesCategory && matchesPrice;
        });

        renderProducts(filteredProducts);
    }

    // ===== MODIFIED: Add loading state =====
    function renderProducts(productsToRender) {
        if (productsToRender.length === 0) {
            productsGrid.innerHTML = '<p class="loading">Loading products...</p>';
            return;
        }

        productsGrid.innerHTML = productsToRender.map(product => `
            <div class="product-card">
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-price">₹${product.price.toFixed(2)}</div>
                    <div class="product-stock ${product.stock <= 0 ? 'out-of-stock' : ''}">
                        ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </div>
                    <button onclick="addToCart(${product.id})" 
                            class="add-to-cart-btn"
                            ${product.stock <= 0 ? 'disabled' : ''}>
                        ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Rest of your existing code remains the same...
    function renderCategories() {
        categoryFilters.innerHTML = categories.map(category => `
            <div class="category-filter">
                <input type="radio" 
                       id="${category}" 
                       name="category" 
                       value="${category}"
                       ${category === currentCategory ? 'checked' : ''}>
                <label for="${category}">${category}</label>
            </div>
        `).join('');

        document.querySelectorAll('input[name="category"]').forEach(input => {
            input.addEventListener('change', (e) => {
                currentCategory = e.target.value;
                filterProducts();
            });
        });
    }
    

    if (priceRange && priceValue) {
        priceRange.addEventListener('input', (e) => {
            maxPrice = parseInt(e.target.value);
            priceValue.textContent = `₹${maxPrice}`;
            filterProducts();
        });
    }

    // ===== MODIFIED: Initialize with async call =====
    renderCategories();
    filterProducts(); // This will now fetch from API
});