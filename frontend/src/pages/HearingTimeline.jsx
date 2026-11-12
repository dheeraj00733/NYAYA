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