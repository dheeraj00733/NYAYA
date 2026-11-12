import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Plus, 
  FileText,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function ExtractedFacts() {
  const [facts, setFacts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [search, setSearch] = useState('');

  // Edit / Review Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFact, setEditingFact] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editVerified, setEditVerified] = useState(true);

  // New Fact Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFact, setNewFact] = useState({
    case_id: '',
    fact_type: 'legal_section',
    key_field: '',
    fact_value: '',
    source_page: 1,
    excerpt: ''
  });

  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    fetchFacts();
  }, [selectedCase, selectedType, verifiedFilter]);

  const fetchCases = async () => {
    try {
      const res = await api.getCases({ limit: 100 });
      if (res.success) {
        setCases(res.cases);
        if (!newFact.case_id && res.cases.length > 0) {
          setNewFact(prev => ({ ...prev, case_id: res.cases[0].id }));
        }
      }
    } catch (e) {
      console.warn('Failed to load cases', e);
    }
  };

  const fetchFacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getFacts({
        case_id: selectedCase || undefined,
        fact_type: selectedType || undefined,
        is_verified: verifiedFilter !== '' ? verifiedFilter : undefined
      });
      if (res.success) {
        setFacts(res.facts);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch extracted facts.');
    } finally {
      setLoading(false);
    }
  };
    const openEditModal = (fact) => {
    setEditingFact(fact);
    setEditKey(fact.key_field);
    setEditValue(fact.fact_value);
    setEditVerified(fact.is_verified);
    setIsEditModalOpen(true);
  };

  const handleUpdateFact = async (e) => {
    e.preventDefault();
    if (!editingFact) return;

    try {
      const res = await api.verifyFact(editingFact.id, {
        is_verified: editVerified,
        corrected_value: editValue,
        key_field: editKey
      });

      if (res.success) {
        showSuccess('Fact entry successfully verified and updated.');
        setIsEditModalOpen(false);
        fetchFacts();
      }
    } catch (err) {
      showError(err.message || 'Failed to update fact.');
    }
  };

  const handleCreateFact = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createFact(newFact);
      if (res.success) {
        showSuccess('New factual entity recorded.');
        setIsAddModalOpen(false);
        setNewFact({
          case_id: cases[0]?.id || '',
          fact_type: 'legal_section',
          key_field: '',
          fact_value: '',
          source_page: 1,
          excerpt: ''
        });
        fetchFacts();
      }
    } catch (err) {
      showError(err.message || 'Failed to create fact.');
    }
  };