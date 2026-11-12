import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Scale, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function HearingTimeline() {
  const [hearings, setHearings] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [caseFilter, setCaseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Schedule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hearingForm, setHearingForm] = useState({
    case_id: '',
    hearing_date: '',
    hearing_time: '10:30',
    court_room: '',
    purpose: 'preliminary',
    presiding_judge: '',
    status: 'scheduled',
    outcome_summary: '',
    next_steps: ''
  });

  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    fetchHearings();
  }, [caseFilter, statusFilter]);

  const fetchCases = async () => {
    try {
      const res = await api.getCases({ limit: 100 });
      if (res.success) {
        setCases(res.cases);
        if (!hearingForm.case_id && res.cases.length > 0) {
          setHearingForm(prev => ({ ...prev, case_id: res.cases[0].id }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch cases', e);
    }
  };

  const fetchHearings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getHearings({
        case_id: caseFilter || undefined,
        status: statusFilter || undefined
      });
      if (res.success) {
        setHearings(res.hearings);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch hearings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHearing = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createHearing(hearingForm);
      if (res.success) {
        showSuccess('Court proceeding scheduled.');
        setIsModalOpen(false);
        fetchHearings();
      }
    } catch (err) {
      showError(err.message || 'Failed to schedule hearing.');
    }
  };