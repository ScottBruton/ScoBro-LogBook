import React, { useState } from 'react';
import { 
  Search as SearchIcon, 
  Delete as DeleteIcon, 
  ViewList as ViewListIcon,
  CalendarToday as CalendarIcon 
} from '@mui/icons-material';

/**
 * Dashboard displays the logbook entries and allows toggling between
 * grouped sessions and a flat item list. It accepts the current
 * entries array and delete handler from the parent component. Filtering and
 * search are simplified for the MVP but can be extended later.
 *
 * Props:
 * - entries: array of { id, timestamp, items: [] }
 * - onDeleteItem: function to delete a specific item (entryId, itemIndex)
 */
export default function Dashboard({ entries, onDeleteItem }) {
  // viewMode: 'daily' (sessions) or 'items' (flat list)
  const [viewMode, setViewMode] = useState('daily');
  const [expandedIds, setExpandedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Flatten items for item view, adding parent timestamp and id for referencing
  const flatItems = entries.flatMap((entry) => {
    return entry.items.map((item, idx) => ({
      ...item,
      parentId: entry.id,
      parentTimestamp: entry.timestamp,
      itemIndex: idx,
    }));
  });

  // Handles removal of an item within a session
  const handleRemoveItem = (parentId, itemIndex) => {
    onDeleteItem(parentId, itemIndex);
  };

  // Search filter: simple case-insensitive match on content and tags
  const filterEntries = (entryList) => {
    if (!searchTerm.trim()) return entryList;
    const term = searchTerm.toLowerCase();
    return entryList.filter((entry) =>
      entry.items.some(
        (item) =>
          item.content.toLowerCase().includes(term) ||
          item.tags.some((t) => t.toLowerCase().includes(term)) ||
          item.jira.some((j) => j.toLowerCase().includes(term)) ||
          item.people.some((p) => p.toLowerCase().includes(term))
      )
    );
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const filteredEntries = filterEntries(entries);
  const filteredFlatItems = filterEntries(entries)
    .flatMap((entry) => {
      return entry.items.map((item, idx) => ({
        ...item,
        parentId: entry.id,
        parentTimestamp: entry.timestamp,
        itemIndex: idx,
      }));
    })
    .filter((item) => {
      // Filter by searchTerm again due to map; but already filtered by filterEntries; still safe.
      return true;
    });

  return (
    <div>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flexGrow: 1, marginRight: '8px', padding: '4px' }}
        />
        <button
          onClick={() => setViewMode('daily')}
          style={{
            padding: '4px 8px',
            marginRight: '4px',
            backgroundColor: viewMode === 'daily' ? '#0275d8' : '#f7f7f7',
            color: viewMode === 'daily' ? '#fff' : '#333',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <CalendarIcon style={{ fontSize: '16px' }} />
          Daily Log
        </button>
        <button
          onClick={() => setViewMode('items')}
          style={{
            padding: '4px 8px',
            backgroundColor: viewMode === 'items' ? '#0275d8' : '#f7f7f7',
            color: viewMode === 'items' ? '#fff' : '#333',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <ViewListIcon style={{ fontSize: '16px' }} />
          Items
        </button>
      </div>

      {/* Content */}
      {viewMode === 'daily' ? (
        <div>
          {filteredEntries.length === 0 ? (
            <p>No entries found.</p>
          ) : (
            filteredEntries.map((entry) => {
              const date = new Date(entry.timestamp);
              const id = entry.id;
              const isExpanded = expandedIds.includes(id);
              return (
                <div
                  key={id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    onClick={() => toggleExpanded(id)}
                    style={{
                      padding: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong>
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </strong>
                      <span style={{ marginLeft: '8px', color: '#777' }}>
                        {entry.items.length} item{entry.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span>{isExpanded ? '▾' : '▸'}</span>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '8px' }}>
                      {entry.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderBottom: idx === entry.items.length - 1 ? 'none' : '1px solid #eee',
                            paddingBottom: '6px',
                            marginBottom: '6px',
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                            {item.type}
                          </div>
                          <div style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{item.content}</div>
                          <div style={{ fontSize: '12px', color: '#555' }}>
                            {item.project && <span style={{ marginRight: '8px' }}>📂 {item.project}</span>}
                            {item.tags.length > 0 && <span style={{ marginRight: '8px' }}>🏷 {item.tags.join(', ')}</span>}
                            {item.jira.length > 0 && <span style={{ marginRight: '8px' }}>🧩 {item.jira.join(', ')}</span>}
                            {item.people.length > 0 && <span>👤 {item.people.join(', ')}</span>}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(id, idx)}
                            style={{
                              marginTop: '4px',
                              background: '#d9534f',
                              color: '#fff',
                              border: 'none',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <DeleteIcon style={{ fontSize: '12px' }} />
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div>
          {filteredFlatItems.length === 0 ? (
            <p>No items found.</p>
          ) : (
            filteredFlatItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '8px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{item.type}</div>
                <div style={{ marginBottom: '4px' }}>{item.content}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>
                  {item.project && <span style={{ marginRight: '8px' }}>📂 {item.project}</span>}
                  {item.tags.length > 0 && <span style={{ marginRight: '8px' }}>🏷 {item.tags.join(', ')}</span>}
                  {item.jira.length > 0 && <span style={{ marginRight: '8px' }}>🧩 {item.jira.join(', ')}</span>}
                  {item.people.length > 0 && <span>👤 {item.people.join(', ')}</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>
                  {new Date(item.parentTimestamp).toLocaleDateString()} {new Date(item.parentTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <button
                  onClick={() => handleRemoveItem(item.parentId, item.itemIndex)}
                  style={{
                    marginTop: '4px',
                    background: '#d9534f',
                    color: '#fff',
                    border: 'none',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <DeleteIcon style={{ fontSize: '12px' }} />
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}