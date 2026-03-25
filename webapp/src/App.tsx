import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Star, X, Info, Phone, ExternalLink, Image as ImageIcon, ChevronRight } from 'lucide-react';

interface MenuItem {
  name: string;
  price: string;
  category: string;
  description: string;
  imageId?: string;
  localImage?: string;
}

interface Restaurant {
  name: string;
  area: string;
  rating: string;
  categories: string[];
  price_for_two: string;
  link: string;
  menu: MenuItem[];
}

const ITEMS_PER_PAGE = 24;

function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [searchType, setSearchType] = useState<'All' | 'Name' | 'Dish' | 'Area'>('All');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    fetch('data/restaurants.json')
      .then(res => res.json())
      .then(data => {
        setRestaurants(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load restaurants:', err);
        setLoading(false); // Stop loading even on error to show state
      });
  }, []);

  const fuse = useMemo(() => {
    const options = {
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'area', weight: 0.3 },
        { name: 'menu.name', weight: 0.7 }
      ],
      threshold: 0.3,
      includeMatches: true
    };
    return new Fuse(restaurants, options);
  }, [restaurants]);

  const filtered = useMemo(() => {
    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination on search
    if (!query) return restaurants;
    
    let results = fuse.search(query);
    
    if (searchType === 'Name') {
      results = results.filter(r => r.item.name.toLowerCase().includes(query.toLowerCase()));
    } else if (searchType === 'Dish') {
      results = results.filter(r => r.item.menu.some(m => m.name.toLowerCase().includes(query.toLowerCase())));
    } else if (searchType === 'Area') {
      results = results.filter(r => r.item.area.toLowerCase().includes(query.toLowerCase()));
    }
    
    return results.map(r => r.item);
  }, [query, restaurants, fuse, searchType]);

  const displayed = filtered.slice(0, visibleCount);

  const getCategoryImage = (categories: string[]) => {
    const cat = categories[0]?.toLowerCase() || 'food';
    if (cat.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=250&fit=crop';
    if (cat.includes('burger')) return 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=250&fit=crop';
    if (cat.includes('biryani') || cat.includes('indian')) return 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=400&h=250&fit=crop';
    if (cat.includes('cake') || cat.includes('bakery') || cat.includes('dessert')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=250&fit=crop';
    if (cat.includes('chinese') || cat.includes('momo')) return 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=400&h=250&fit=crop';
    if (cat.includes('sandwich') || cat.includes('cafe')) return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=250&fit=crop';
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop';
  }

  const getSwiggyImage = (imageId: string) => {
    return `https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_300,h_300,c_fit/${imageId}`;
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <ImageIcon size={48} />
      </motion.div>
      <span style={{ marginLeft: '1rem' }}>Loading 600+ Restaurants...</span>
    </div>
  );

  return (
    <div className="app-container">
      <header>
        <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          TakeEat Vadodara
        </motion.h1>
        <p className="subtitle">Discover {restaurants.length} Restaurants & Menus</p>
      </header>

      <div className="search-box">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search by resttaurant, dish, or area..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filters">
          {(['All', 'Name', 'Dish', 'Area'] as const).map(t => (
            <button
              key={t}
              className={`filter-chip ${searchType === t ? 'active' : ''}`}
              onClick={() => setSearchType(t)}
            >
              {t}
            </button>
          ))}
          <span className="results-count" style={{ marginLeft: 'auto', color: 'var(--text-muted)', alignSelf: 'center', fontSize: '0.9rem' }}>
            {filtered.length} found
          </span>
        </div>
      </div>

      <div className="restaurant-grid">
        <AnimatePresence>
          {displayed.map((rest, idx) => (
            <motion.div
              layout
              key={rest.name + idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="restaurant-card"
              onClick={() => setSelectedRest(rest)}
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <div 
                className="card-banner" 
                style={{ 
                  height: '140px', 
                  backgroundImage: `url(${getCategoryImage(rest.categories)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}></div>
                <div className="rating" style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}>
                  <Star size={14} fill="currentColor" />
                  {rest.rating.split(' ')[0]}
                </div>
              </div>
              
              <div style={{ padding: '1.5rem' }}>
                <div className="card-header">
                  <h2 className="restaurant-name">{rest.name}</h2>
                </div>
                <div className="area">
                  <MapPin size={14} />
                  {rest.area}
                </div>
                <div className="categories">
                  {rest.categories.slice(0, 3).join(', ')}
                </div>
                
                {query && searchType === 'Dish' && (
                  <div className="menu-hits">
                    {rest.menu
                      .filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
                      .slice(0, 2)
                      .map((m, i) => (
                        <div key={i} className="dish-hit">
                          <span>{m.name}</span>
                          <span className="dish-price">{m.price}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {visibleCount < filtered.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <button 
            className="filter-chip active" 
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
            onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)}
          >
            Show More Restaurants
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectedRest && (
          <div className="modal-overlay" onClick={() => setSelectedRest(null)}>
            <motion.div
              className="modal-content"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-button" onClick={() => setSelectedRest(null)} style={{ zIndex: 10 }}>
                <X size={24} />
              </button>
              
              <div 
                className="modal-banner"
                style={{
                  height: '250px',
                  margin: '-2.5rem -2.5rem 1.5rem -2.5rem',
                  backgroundImage: `url(${getCategoryImage(selectedRest.categories)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  borderRadius: '2rem 2rem 0 0'
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg), transparent)' }}></div>
                <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem', right: '2.5rem' }}>
                   <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{selectedRest.name}</h2>
                   <div className="area" style={{ fontSize: '1.1rem', color: 'white' }}>
                    <MapPin size={18} /> {selectedRest.area}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div className="rating" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
                  <Star size={18} fill="currentColor" /> {selectedRest.rating}
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <Info size={18} /> {selectedRest.price_for_two}
                </div>
                <a href={selectedRest.link} target="_blank" rel="noreferrer" className="filter-chip active" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <ExternalLink size={16} /> Swiggy Menu
                </a>
              </div>

              <hr style={{ borderColor: 'var(--border-dark)', marginBottom: '1rem' }} />
              
              {/* Grouped Menu */}
              {Object.entries(
                selectedRest.menu.reduce((acc, item) => {
                  const cat = item.category || 'Other';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(item);
                  return acc;
                }, {} as Record<string, MenuItem[]>)
              ).map(([cat, items]) => (
                <div key={cat} className="menu-category">
                  <h3 className="category-title">{cat}</h3>
                  {items.map((item, i) => (
                    <div key={i} className="menu-item" style={{ alignItems: 'flex-start' }}>
                      <div className="item-info" style={{ flex: 1 }}>
                        <span className="item-name">{item.name}</span>
                        {item.description && <span className="item-desc">{item.description}</span>}
                        <span className="item-price" style={{ marginTop: '0.5rem', display: 'block' }}>{item.price}</span>
                      </div>
                      
                      {(item.localImage || item.imageId) && (
                        <div className="item-image" style={{ width: '80px', height: '80px', borderRadius: '1rem', overflow: 'hidden', marginLeft: '1rem', flexShrink: 0 }}>
                          <img 
                            src={item.localImage ? item.localImage.replace(/^\//, '') : getSwiggyImage(item.imageId!)} 
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
