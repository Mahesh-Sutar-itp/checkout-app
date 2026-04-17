// src/pages/HomePage.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import useCartStore from "../store/cartStore";
import "./HomePage.css";

function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState("default");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const navigate = useNavigate();
  const { addItem, cartItems, addNotification } = useCartStore();
  const parentRef = useRef(null);

  // ===== RESIZE LISTENER =====
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ===== API FETCH =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("https://fakestoreapi.com/products"),
          fetch("https://fakestoreapi.com/products/categories"),
        ]);
        const prodData = await prodRes.json();
        const catData = await catRes.json();

        const expanded = [];
        for (let i = 0; i < 50; i++) {
          prodData.forEach((p) => {
            expanded.push({ ...p, uid: `${p.id}-${i}` });
          });
        }

        setProducts(expanded);
        setCategories(catData);
        setLoading(false);
      } catch (err) {
        addNotification("Failed to load products!", "error");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ===== DEBOUNCED SEARCH =====
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ===== FILTER + SEARCH + SORT =====
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchSearch = p.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchCategory =
        category === "all" || p.category === category;
      return matchSearch && matchCategory;
    });

    if (sortBy === "price-low") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-az") {
      result = [...result].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
    }

    return result;
  }, [products, search, category, sortBy]);

  // ===== GRID ROWS =====
  const COLUMNS = windowWidth <= 768 ? 2
              : windowWidth <= 1024 ? 3
              : 4;

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < filteredProducts.length; i += COLUMNS) {
      result.push(filteredProducts.slice(i, i + COLUMNS));
    }
    return result;
  }, [filteredProducts, COLUMNS]);

  // ===== ROW HEIGHT - Responsive =====
  const getRowHeight = () => {
    if (windowWidth < 768) return 250
    if (windowWidth >= 768 && windowWidth <= 1024) return 320
    return 320
  }

  const isMobile = windowWidth <= 768;

  // ===== VIRTUALIZER =====
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => getRowHeight(),
    overscan: 3,
  });

  // ✅ windowWidth change hone par force update
  useEffect(() => {
    virtualizer.measure()
  }, [windowWidth])

  // ===== ADD TO CART =====
  const handleAddToCart = useCallback(
    (product) => {
      addItem(product);
      addNotification(
        `${product.title.slice(0, 20)}... added to cart!`,
        "success"
      );
    },
    [addItem, addNotification]
  );

  if (loading)
    return (
      <div className="loading-container">
        Loading products... ⏳
      </div>
    );

  return (
    <div className="home-wrapper">

      {/* HEADER */}
      <div className="home-header">
        <h1>🛒 ShopFast</h1>
        <button
          className="cart-btn"
          onClick={() => navigate("/cart")}
        >
          Cart ({cartItems.length})
        </button>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search products..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="search-input"
      />

      {/* CATEGORY FILTER */}
      <div className="category-filters">
        <button
          className={`category-btn ${category === "all" ? "active" : ""}`}
          onClick={() => setCategory("all")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${category === cat ? "active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* SORT */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "16px",
      }}>
        <span style={{
          fontSize: "14px",
          color: "#666",
          fontWeight: "600"
        }}>
          Sort:
        </span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="default">Default</option>
          <option value="price-low">Price: Low to High ⬆️</option>
          <option value="price-high">Price: High to Low ⬇️</option>
          <option value="name-az">Name: A to Z 🔤</option>
        </select>
      </div>

      {/* COUNT */}
      <p className="products-count">
        {filteredProducts.length} products found
        <span style={{
          fontSize: "12px",
          color: "#999",
          marginLeft: "8px"
        }}>
          (Virtual rendering: only{" "}
          {virtualizer.getVirtualItems().length} in DOM)
        </span>
      </p>

      {/* VIRTUAL SCROLL CONTAINER */}
      <div
        ref={parentRef}
        style={{
          height: "calc(100vh - 280px)",
          overflow: "auto",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowItems = rows[virtualRow.index];
            if (!rowItems) return null;

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="products-grid">
                  {rowItems.map((product) => (
                    <div key={product.uid} className="product-card">
                      <img
                        src={product.image}
                        alt={product.title}
                        loading="lazy"
                      />
                      <p className="product-title">{product.title}</p>
                      <p className="product-price">₹{product.price}</p>
                      <button
                        className="add-to-cart-btn"
                        onClick={() => handleAddToCart(product)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default HomePage;