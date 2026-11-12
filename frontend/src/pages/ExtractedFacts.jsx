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
