import React, { useState, useEffect } from 'react';
import { 
  Search as SearchIcon, 
  Delete as DeleteIcon, 
  ViewList as ViewListIcon,
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { DataService } from '../services/dataService.js';

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
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  
  // Advanced filtering states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [selectedJira, setSelectedJira] = useState([]);
  const [contentLengthRange, setContentLengthRange] = useState({ min: '', max: '' });
  const [hasProject, setHasProject] = useState('');
  const [hasTags, setHasTags] = useState('');
  const [hasPeople, setHasPeople] = useState('');
  const [hasJira, setHasJira] = useState('');
  
  // Sorting states
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Filter presets
  const [filterPresets, setFilterPresets] = useState({});
  const [activePreset, setActivePreset] = useState('');

  // Load projects and tags on component mount
  useEffect(() => {
    loadProjects();
    loadTags();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await DataService.getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadTags = async () => {
    try {
      const data = await DataService.getAllTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

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

  // Get all unique values for filter options
  const getAllUniqueValues = () => {
    const allTags = new Set();
    const allPeople = new Set();
    const allJira = new Set();
    
    entries.forEach(entry => {
      entry.items.forEach(item => {
        item.tags.forEach(tag => allTags.add(tag));
        item.people.forEach(person => allPeople.add(person));
        item.jira.forEach(jira => allJira.add(jira));
      });
    });
    
    return {
      tags: Array.from(allTags).sort(),
      people: Array.from(allPeople).sort(),
      jira: Array.from(allJira).sort()
    };
  };

  const uniqueValues = getAllUniqueValues();

  // Enhanced filter: search term, project, type, and advanced filters
  const filterEntries = (entryList) => {
    let filtered = entryList;

    // Apply search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((entry) =>
        entry.items.some(
          (item) =>
            item.content.toLowerCase().includes(term) ||
            item.tags.some((t) => t.toLowerCase().includes(term)) ||
            item.jira.some((j) => j.toLowerCase().includes(term)) ||
            item.people.some((p) => p.toLowerCase().includes(term))
        )
      );
    }

    // Apply project filter
    if (selectedProject) {
      filtered = filtered.filter((entry) =>
        entry.items.some((item) => item.project === selectedProject)
      );
    }

    // Apply type filter
    if (selectedType) {
      filtered = filtered.filter((entry) =>
        entry.items.some((item) => item.type === selectedType)
      );
    }

    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;
        
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        return true;
      });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((entry) =>
        entry.items.some((item) =>
          selectedTags.some(selectedTag => item.tags.includes(selectedTag))
        )
      );
    }

    // Apply people filter
    if (selectedPeople.length > 0) {
      filtered = filtered.filter((entry) =>
        entry.items.some((item) =>
          selectedPeople.some(selectedPerson => item.people.includes(selectedPerson))
        )
      );
    }

    // Apply Jira filter
    if (selectedJira.length > 0) {
      filtered = filtered.filter((entry) =>
        entry.items.some((item) =>
          selectedJira.some(selectedJiraRef => item.jira.includes(selectedJiraRef))
        )
      );
    }

    // Apply content length filter
    if (contentLengthRange.min || contentLengthRange.max) {
      filtered = filtered.filter((entry) =>
        entry.items.some((item) => {
          const length = item.content.length;
          const minLength = contentLengthRange.min ? parseInt(contentLengthRange.min) : 0;
          const maxLength = contentLengthRange.max ? parseInt(contentLengthRange.max) : Infinity;
          return length >= minLength && length <= maxLength;
        })
      );
    }

    // Apply existence filters
    if (hasProject !== '') {
      const hasProjectBool = hasProject === 'true';
      filtered = filtered.filter((entry) =>
        entry.items.some((item) => (item.project && item.project.trim() !== '') === hasProjectBool)
      );
    }

    if (hasTags !== '') {
      const hasTagsBool = hasTags === 'true';
      filtered = filtered.filter((entry) =>
        entry.items.some((item) => (item.tags.length > 0) === hasTagsBool)
      );
    }

    if (hasPeople !== '') {
      const hasPeopleBool = hasPeople === 'true';
      filtered = filtered.filter((entry) =>
        entry.items.some((item) => (item.people.length > 0) === hasPeopleBool)
      );
    }

    if (hasJira !== '') {
      const hasJiraBool = hasJira === 'true';
      filtered = filtered.filter((entry) =>
        entry.items.some((item) => (item.jira.length > 0) === hasJiraBool)
      );
    }

    return filtered;
  };

  // Enhanced sorting function
  const sortEntries = (entryList) => {
    return [...entryList].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp) - new Date(b.timestamp);
          break;
        case 'type':
          const aTypes = a.items.map(item => item.type).sort().join(', ');
          const bTypes = b.items.map(item => item.type).sort().join(', ');
          comparison = aTypes.localeCompare(bTypes);
          break;
        case 'project':
          const aProjects = a.items.map(item => item.project || '').filter(p => p).sort().join(', ');
          const bProjects = b.items.map(item => item.project || '').filter(p => p).sort().join(', ');
          comparison = aProjects.localeCompare(bProjects);
          break;
        case 'contentLength':
          const aLength = a.items.reduce((sum, item) => sum + item.content.length, 0);
          const bLength = b.items.reduce((sum, item) => sum + item.content.length, 0);
          comparison = aLength - bLength;
          break;
        case 'itemCount':
          comparison = a.items.length - b.items.length;
          break;
        case 'tagCount':
          const aTagCount = a.items.reduce((sum, item) => sum + item.tags.length, 0);
          const bTagCount = b.items.reduce((sum, item) => sum + item.tags.length, 0);
          comparison = aTagCount - bTagCount;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  // Filter preset functions
  const saveFilterPreset = (presetName) => {
    const preset = {
      searchTerm,
      selectedProject,
      selectedType,
      dateRange,
      selectedTags,
      selectedPeople,
      selectedJira,
      contentLengthRange,
      hasProject,
      hasTags,
      hasPeople,
      hasJira,
      sortBy,
      sortOrder
    };
    
    setFilterPresets(prev => ({
      ...prev,
      [presetName]: preset
    }));
    setActivePreset(presetName);
  };

  const loadFilterPreset = (presetName) => {
    const preset = filterPresets[presetName];
    if (preset) {
      setSearchTerm(preset.searchTerm);
      setSelectedProject(preset.selectedProject);
      setSelectedType(preset.selectedType);
      setDateRange(preset.dateRange);
      setSelectedTags(preset.selectedTags);
      setSelectedPeople(preset.selectedPeople);
      setSelectedJira(preset.selectedJira);
      setContentLengthRange(preset.contentLengthRange);
      setHasProject(preset.hasProject);
      setHasTags(preset.hasTags);
      setHasPeople(preset.hasPeople);
      setHasJira(preset.hasJira);
      setSortBy(preset.sortBy);
      setSortOrder(preset.sortOrder);
      setActivePreset(presetName);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedProject('');
    setSelectedType('');
    setDateRange({ start: '', end: '' });
    setSelectedTags([]);
    setSelectedPeople([]);
    setSelectedJira([]);
    setContentLengthRange({ min: '', max: '' });
    setHasProject('');
    setHasTags('');
    setHasPeople('');
    setHasJira('');
    setSortBy('date');
    setSortOrder('desc');
    setActivePreset('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedProject) count++;
    if (selectedType) count++;
    if (dateRange.start || dateRange.end) count++;
    if (selectedTags.length > 0) count++;
    if (selectedPeople.length > 0) count++;
    if (selectedJira.length > 0) count++;
    if (contentLengthRange.min || contentLengthRange.max) count++;
    if (hasProject !== '') count++;
    if (hasTags !== '') count++;
    if (hasPeople !== '') count++;
    if (hasJira !== '') count++;
    return count;
  };

  const filteredEntries = sortEntries(filterEntries(entries));
  const filteredFlatItems = sortEntries(filterEntries(entries))
    .flatMap((entry) => {
      return entry.items.map((item, idx) => ({
        ...item,
        parentId: entry.id,
        parentTimestamp: entry.timestamp,
        itemIndex: idx,
      }));
    });

  return (
    <div>
      {/* Top bar */}
      <div style={{ marginBottom: '12px' }}>
        {/* Search and View Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flexGrow: 1, padding: '4px' }}
            />
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                padding: '4px 8px',
                backgroundColor: showAdvancedFilters ? '#0275d8' : '#f7f7f7',
                color: showAdvancedFilters ? '#fff' : '#333',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                position: 'relative'
              }}
            >
              <FilterIcon style={{ fontSize: '16px' }} />
              Filters
              {getActiveFilterCount() > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setViewMode('daily')}
              style={{
                padding: '4px 8px',
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
        </div>

        {/* Basic Filter Controls */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '8px'
          }}
        >
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.name}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">All Types</option>
            <option value="Action">Action</option>
            <option value="Decision">Decision</option>
            <option value="Note">Note</option>
            <option value="Meeting">Meeting</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="date">Sort by Date</option>
            <option value="type">Sort by Type</option>
            <option value="project">Sort by Project</option>
            <option value="contentLength">Sort by Content Length</option>
            <option value="itemCount">Sort by Item Count</option>
            <option value="tagCount">Sort by Tag Count</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{
              padding: '4px 8px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <SortIcon style={{ fontSize: '12px' }} />
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          {getActiveFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ClearIcon style={{ fontSize: '12px' }} />
              Clear All
            </button>
          )}
        </div>

        {/* Advanced Filter Panel */}
        {showAdvancedFilters && (
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '16px',
              backgroundColor: '#f9f9f9',
              marginBottom: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FilterIcon style={{ fontSize: '16px' }} />
                Advanced Filters
              </h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Preset name"
                  id="presetName"
                  style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                />
                <button
                  onClick={() => {
                    const presetName = document.getElementById('presetName').value;
                    if (presetName.trim()) {
                      saveFilterPreset(presetName.trim());
                      document.getElementById('presetName').value = '';
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <SaveIcon style={{ fontSize: '12px' }} />
                  Save
                </button>
                {Object.keys(filterPresets).length > 0 && (
                  <select
                    value={activePreset}
                    onChange={(e) => loadFilterPreset(e.target.value)}
                    style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="">Load Preset</option>
                    {Object.keys(filterPresets).map(preset => (
                      <option key={preset} value={preset}>{preset}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Date Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Date Range:
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Content Length */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Content Length:
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="number"
                    placeholder="Min"
                    value={contentLengthRange.min}
                    onChange={(e) => setContentLengthRange(prev => ({ ...prev, min: e.target.value }))}
                    style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', width: '60px' }}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={contentLengthRange.max}
                    onChange={(e) => setContentLengthRange(prev => ({ ...prev, max: e.target.value }))}
                    style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', width: '60px' }}
                  />
                </div>
              </div>

              {/* Existence Filters */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Has Project:
                </label>
                <select
                  value={hasProject}
                  onChange={(e) => setHasProject(e.target.value)}
                  style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', width: '100%' }}
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Has Tags:
                </label>
                <select
                  value={hasTags}
                  onChange={(e) => setHasTags(e.target.value)}
                  style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', width: '100%' }}
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Has People:
                </label>
                <select
                  value={hasPeople}
                  onChange={(e) => setHasPeople(e.target.value)}
                  style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', width: '100%' }}
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Has Jira:
                </label>
                <select
                  value={hasJira}
                  onChange={(e) => setHasJira(e.target.value)}
                  style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', width: '100%' }}
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            {/* Multi-select filters */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {/* Tags Filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                    Tags ({selectedTags.length} selected):
                  </label>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px', padding: '4px' }}>
                    {uniqueValues.tags.map(tag => (
                      <label key={tag} style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTags(prev => [...prev, tag]);
                            } else {
                              setSelectedTags(prev => prev.filter(t => t !== tag));
                            }
                          }}
                          style={{ marginRight: '4px' }}
                        />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>

                {/* People Filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                    People ({selectedPeople.length} selected):
                  </label>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px', padding: '4px' }}>
                    {uniqueValues.people.map(person => (
                      <label key={person} style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                        <input
                          type="checkbox"
                          checked={selectedPeople.includes(person)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPeople(prev => [...prev, person]);
                            } else {
                              setSelectedPeople(prev => prev.filter(p => p !== person));
                            }
                          }}
                          style={{ marginRight: '4px' }}
                        />
                        {person}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Jira Filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                    Jira ({selectedJira.length} selected):
                  </label>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px', padding: '4px' }}>
                    {uniqueValues.jira.map(jira => (
                      <label key={jira} style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>
                        <input
                          type="checkbox"
                          checked={selectedJira.includes(jira)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedJira(prev => [...prev, jira]);
                            } else {
                              setSelectedJira(prev => prev.filter(j => j !== jira));
                            }
                          }}
                          style={{ marginRight: '4px' }}
                        />
                        {jira}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div style={{ 
        marginBottom: '12px', 
        padding: '8px', 
        backgroundColor: '#e9ecef', 
        borderRadius: '4px',
        fontSize: '14px',
        color: '#495057'
      }}>
        Showing {filteredEntries.length} of {entries.length} entries
        {getActiveFilterCount() > 0 && (
          <span style={{ marginLeft: '8px', color: '#6c757d' }}>
            ({getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active)
          </span>
        )}
        {activePreset && (
          <span style={{ marginLeft: '8px', color: '#007bff' }}>
            • Preset: {activePreset}
          </span>
        )}
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
                            {item.project && (
                              <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: projects.find(p => p.name === item.project)?.color || '#0275d8',
                                    display: 'inline-block'
                                  }}
                                />
                                📂 {item.project}
                              </span>
                            )}
                            {item.tags.length > 0 && (
                              <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                🏷 {item.tags.map((tagName, idx) => {
                                  const tag = tags.find(t => t.name === tagName);
                                  return (
                                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                      <span
                                        style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '50%',
                                          backgroundColor: tag?.color || '#6c757d',
                                          display: 'inline-block'
                                        }}
                                      />
                                      {tagName}
                                    </span>
                                  );
                                }).reduce((prev, curr, idx) => [prev, idx > 0 ? ', ' : '', curr])}
                              </span>
                            )}
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
                  {item.project && (
                    <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: projects.find(p => p.name === item.project)?.color || '#0275d8',
                          display: 'inline-block'
                        }}
                      />
                      📂 {item.project}
                    </span>
                  )}
                  {item.tags.length > 0 && (
                    <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      🏷 {item.tags.map((tagName, idx) => {
                        const tag = tags.find(t => t.name === tagName);
                        return (
                          <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: tag?.color || '#6c757d',
                                display: 'inline-block'
                              }}
                            />
                            {tagName}
                          </span>
                        );
                      }).reduce((prev, curr, idx) => [prev, idx > 0 ? ', ' : '', curr])}
                    </span>
                  )}
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