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
