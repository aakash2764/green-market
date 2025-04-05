import os


from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import exc

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    image = db.Column(db.String(255))
    description = db.Column(db.Text)
    stock = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'category': self.category,
            'image': self.image,
            'description': self.description,
            'stock': self.stock
        }

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    total = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')
    items = db.relationship('OrderItem', backref='order', lazy=True)

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    product = db.relationship('Product')

# Helper Functions
def calculate_order_total(items):
    return sum(item['price'] * item['quantity'] for item in items)

# API Endpoints
@app.route('/')
def home():
    return jsonify({
        "status": "running",
        "message": "GreenMarket API is operational",
        "endpoints": {
            "products": "/api/products",
            "checkout": "/api/checkout"
        }
    })

@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        products = Product.query.all()
        return jsonify([product.to_dict() for product in products])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>/stock', methods=['GET'])
def check_stock(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify({
        'available': product.stock > 0,
        'stock': product.stock
    })

@app.route('/api/cart/verify', methods=['POST'])
def verify_cart():
    try:
        items = request.json.get('items', [])
        verified_items = []
        all_valid = True
        
        for item in items:
            product = Product.query.get(item.get('id'))
            if not product:
                return jsonify({'error': f'Product {item.get("id")} not found'}), 404
            
            available_qty = min(item.get('quantity', 0), product.stock)
            verified_item = {
                'id': product.id,
                'name': product.name,
                'price': product.price,
                'image': product.image,
                'quantity': available_qty,
                'max_stock': product.stock
            }
            verified_items.append(verified_item)
            
            if available_qty != item.get('quantity', 0):
                all_valid = False
        
        return jsonify({
            'valid': all_valid,
            'cart': verified_items,
            'message': 'Stock verified' if all_valid else 'Some items adjusted to available stock'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/checkout', methods=['POST'])
def checkout():
    try:
        data = request.get_json()
        if not data or 'items' not in data:
            return jsonify({'error': 'Invalid request data'}), 400
        
        db.session.begin()
        
        # 1. Verify stock and calculate total
        total = 0.0
        for item in data['items']:
            product = Product.query.with_for_update().get(item['id'])
            if not product:
                db.session.rollback()
                return jsonify({'error': f'Product {item["id"]} not found'}), 404
            
            if product.stock < item['quantity']:
                db.session.rollback()
                return jsonify({
                    'error': f'Not enough stock for {product.name}',
                    'productId': product.id,
                    'available': product.stock
                }), 400
            
            total += product.price * item['quantity']
        
        # 2. Create order
        order = Order(
            total=total,
            payment_method=data.get('paymentMethod', 'unknown'),
            status='processing'
        )
        db.session.add(order)
        db.session.flush()  # Get the order ID
        
        # 3. Create order items and update inventory
        for item in data['items']:
            product = Product.query.get(item['id'])
            
            # Add order item
            db.session.add(OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item['quantity'],
                price=product.price
            ))
            
            # Update inventory
            product.stock -= item['quantity']
            db.session.add(product)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'orderId': order.id,
            'total': total
        })
        
    except exc.SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error: ' + str(e)}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Database Initialization
with app.app_context():
    print("Initializing database...")
    db.create_all()
    
    # Add sample data if database is empty
    if not Product.query.first():
        print("Adding sample products...")
        sample_products = [
            Product(
                name="Bamboo Water Bottle",
                price=999,
                category="Kitchen",
                image="https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400",
                description="Eco-friendly bamboo water bottle with vacuum insulation.",
                stock=10
            ),
            Product(
                name="Bamboo Cutlery Set",
                price=2000,
                category="Kitchen",
                image="https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400",
                description="Portable bamboo cutlery set with carrying case.",
                stock=15
            ),
            Product(
                name="Organic Cotton Tote",
                price=349,
                category="Bags",
                image="https://example.com/tote.jpg",
                description="100% organic cotton shopping tote.",
                stock=20
            )
        ]
        db.session.bulk_save_objects(sample_products)
        db.session.commit()
        print("Sample products added successfully")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)