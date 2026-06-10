import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Droplets, Wind, Fan, Soup, Sparkles, BatteryCharging, Lamp, Plus, Minus, Copy, RotateCcw, 
  Tv, Refrigerator, AirVent, Smartphone, Laptop, WashingMachine, Package, ShieldCheck, 
  Headphones, Cpu, Watch, Sword, CheckCircle2, Tv2, UserPlus, Trash2, AlertCircle, 
  History, X, Camera, RefreshCw, LogIn, LogOut, FileSpreadsheet, ChevronRight, Share2, 
  Settings, Phone, ExternalLink, Calendar, Search, HelpCircle, Check, MapPin, Info,
  BarChart3, TrendingUp, Award, Users, Wallet, Volume2, CookingPot, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';

import { PriceWarStats, LeadInfo, ReportState, SyncLog, CustomField } from './types';
import { DBService } from './lib/db';
import html2canvas from 'html2canvas-pro';

// Capture and share helper using Web Share API
const handleExportAndShare = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error('Không tìm thấy vùng dữ liệu để chụp hình!');
    return;
  }

  const toastId = toast.loading('Đang khởi tạo ảnh chụp báo cáo...');
  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: 2, // improve quality
      backgroundColor: document.documentElement.classList.contains('dark') ? '#1C1C1E' : '#FFFFFF',
      logging: false
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Lỗi xuất canvas thành blob!', { id: toastId });
        return;
      }

      const file = new File([blob], filename, { type: 'image/png' });

      // Check if navigator.share and navigator.canShare are supported for files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        toast.loading('Đang kích hoạt tính năng chia sẻ của hệ thống...', { id: toastId });
        try {
          await navigator.share({
            files: [file],
            title: 'Báo cáo bán hàng',
            text: 'Gửi báo cáo bán hàng cuối ngày của bạn qua Line/Zalo.'
          });
          toast.success('Đã mở trình chia sẻ thành công!', { id: toastId });
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            toast.dismiss(toastId);
            return;
          }
          throw shareErr;
        }
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Thiết bị không hỗ trợ chia sẻ file trực tiếp. Đã tự động tải ảnh về máy!', { id: toastId });
      }
    }, 'image/png');
  } catch (err: any) {
    toast.error(`Lỗi xuất ảnh: ${err.message}`, { id: toastId });
  }
};

// --- Default Initial State ---
const initialState: ReportState = {
  staffName: '',
  cash: '',
  installment: '',
  moVi: false,
  showPriceWar: false,
  products: {
    tivi: 0,
    tuLanh: 0,
    mayGiat: 0,
    mayLanh: 0,
    smpTab: 0,
    laptop: 0,
    otherName: '',
    otherCount: 0,
  },
  household: {
    mln: 0,
    qdh: 0,
    quat: 0,
    noiCom: 0,
    noiChien: 0,
    locKk: 0,
    otherName: '',
    otherCount: 0,
  },
  services: {
    vi: '',
    vieon: 0,
    sim: 0,
    dongHo: 0,
    insurance: '',
  },
  accessories: {
    camera: 0,
    sdp: 0,
    den: 0,
    loa: 0,
    otherName: '',
    otherCount: 0,
  },
  priceWar: {
    ce: { tc: '', ss: '', ch: '', bo: '', xtt: '' },
    ict: { tc: '', ss: '', ch: '', bo: '', xtt: '' },
  },
  leads: [],
  notes: ''
};



const WARNING_ITEMS = [
  { group: 'products', key: 'tivi', name: 'Tivi' },
  { group: 'products', key: 'tuLanh', name: 'Tủ lạnh' },
  { group: 'products', key: 'mayGiat', name: 'Máy giặt' },
  { group: 'products', key: 'mayLanh', name: 'Máy lạnh' },
  { group: 'products', key: 'smpTab', name: 'SMP/Tab' },
  { group: 'products', key: 'laptop', name: 'Laptop' },
  { group: 'household', key: 'mln', name: 'Máy lọc nước' },
  { group: 'household', key: 'qdh', name: 'Quạt điều hòa' },
  { group: 'household', key: 'quat', name: 'Quạt' },
  { group: 'household', key: 'noiCom', name: 'Nồi cơm' },
  { group: 'household', key: 'noiChien', name: 'Nồi chiên' },
  { group: 'household', key: 'locKk', name: 'Lọc KK' },
  { group: 'services', key: 'vi', name: 'Ví' },
  { group: 'services', key: 'vieon', name: 'Vieon' },
  { group: 'services', key: 'sim', name: 'SIM' },
  { group: 'services', key: 'dongHo', name: 'Đồng hồ' },
  { group: 'accessories', key: 'camera', name: 'Camera' },
  { group: 'accessories', key: 'sdp', name: 'SDP' },
  { group: 'accessories', key: 'den', name: 'Đèn' },
  { group: 'accessories', key: 'loa', name: 'Loa' }
];

const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
};

const displayStatus = (status: string | undefined): string => {
  if (!status || status === 'Chưa liên hệ') return 'Chưa liên hệ';
  if (status === 'Khách tham khảo') return 'Tham khảo';
  if (status === 'Khách đã mua') return 'Từ chối';
  return status;
};

const isValidStaffName = (name: string): boolean => {
  return /^\d+\s*-\s*\S+/.test(name.trim());
};

export default function App() {
  const [state, setState] = useState<ReportState>(initialState);

  const [history, setHistory] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [activeTab, setActiveTab] = useState<'report' | 'leads' | 'history' | 'sync' | 'dashboard'>('report');
  
  // App states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(true);
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Dashboard / Team charts states
  const [sheetRows, setSheetRows] = useState<any[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardTimeRange, setDashboardTimeRange] = useState<'today' | 'week'>('today');

  // Synchronization State
  const [isSyncing, setIsSyncing] = useState(false);

  // Custom Fields States
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldTargetGroup, setCustomFieldTargetGroup] = useState<CustomField['group'] | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('count');

  const handleAddCustomField = async () => {
    if (!newFieldName.trim() || !customFieldTargetGroup) {
      toast.error('Vui lòng điền tên danh mục mới!');
      return;
    }

    const fieldId = 'cf_' + newFieldName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    
    const newField: CustomField = {
      id: fieldId,
      name: newFieldName.trim(),
      group: customFieldTargetGroup,
      type: newFieldType
    };

    const updated = [...customFields, newField];
    setCustomFields(updated);
    await DBService.saveCustomFields(updated);

    // Add key to state immediately
    handleStateChange(prev => ({
      ...prev,
      [customFieldTargetGroup]: {
        ...prev[customFieldTargetGroup],
        [fieldId]: newFieldType === 'count' ? 0 : ''
      }
    }));

    setNewFieldName('');
    setCustomFieldTargetGroup(null);
    toast.success(`Đã thêm danh mục mới: ${newField.name}`);
  };

  const handleDeleteCustomField = async (cf: CustomField) => {
    if (confirm(`Bạn có chắc chắn muốn xoá danh mục "${cf.name}" không?`)) {
      const updated = customFields.filter(f => f.id !== cf.id);
      setCustomFields(updated);
      await DBService.saveCustomFields(updated);

      // Clean from state
      handleStateChange(prev => {
        const next = { ...prev };
        if (next[cf.group]) {
          const groupData = { ...next[cf.group] };
          delete groupData[cf.id];
          next[cf.group] = groupData;
        }
        return next;
      });

      toast.success(`Đã xoá danh mục: ${cf.name}`);
    }
  };

  const loadDashboardData = useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      const localReports = await DBService.getAllReports();
      const mapped = localReports.map((item: any) => ({
        date: item.date || '',
        staffName: item.staffName || 'Bạn (Local)',
        cash: parseFloat(item.cash) || 0,
        installment: parseFloat(item.installment) || 0,
        moVi: item.moVi || false,
        showPriceWar: item.showPriceWar || false,
        tivi: item.products?.tivi || 0,
        tuLanh: item.products?.tuLanh || 0,
        mayGiat: item.products?.mayGiat || 0,
        mayLanh: item.products?.mayLanh || 0,
        smpTab: item.products?.smpTab || 0,
        laptop: item.products?.laptop || 0,
        mln: item.household?.mln || 0,
        qdh: item.household?.qdh || 0,
        quat: item.household?.quat || 0,
        noiCom: item.household?.noiCom || 0,
        locKk: item.household?.locKk || 0,
        insurance: parseFloat(item.services?.insurance) || 0,
        vi: parseFloat(item.services?.vi) || 0,
        maintenance: parseFloat(item.services?.maintenance) || 0,
        vieon: item.services?.vieon || 0,
        sim: item.services?.sim || 0,
        camera: item.accessories?.camera || 0,
        sdp: item.accessories?.sdp || 0,
        loa: item.accessories?.loa || item.accessories?.taiNghe || 0,
        den: item.accessories?.den || 0,
        dongHo: item.services?.dongHo || item.accessories?.dongHo || 0,
      }));

      // Map dynamic custom fields for dashboard
      const mappedWithCustom = mapped.map((row: any, idx: number) => {
        const item = localReports[idx];
        const updatedRow = { ...row };
        customFields.forEach(cf => {
          const val = item[cf.group]?.[cf.id];
          updatedRow[cf.id] = cf.type === 'count' ? (Number(val) || 0) : (parseFloat(val) || 0);
        });
        return updatedRow;
      });

      setSheetRows(mappedWithCustom);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [customFields]);

  const handleResetForm = () => {
    setState(prev => ({
      ...initialState,
      staffName: prev.staffName,
      leads: prev.leads
    }));
    setWarnings([]);
    toast.success('Đã làm sạch số lượng và doanh thu! Sẵn sàng nhập đơn sau.', {
      icon: '🔄'
    });
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    }
  }, [activeTab, loadDashboardData]);

  // Load Initial Data from IndexedDB on startup
  useEffect(() => {
    async function loadInitialData() {
      try {
        // 1. Initialize IndexedDB and load items
        const rawDraft = await DBService.loadDraft();
        if (rawDraft) {
          if (rawDraft.leads && Array.isArray(rawDraft.leads)) {
            rawDraft.leads = rawDraft.leads.map((l: any) => ({
              ...l,
              status: l.status || 'Chưa liên hệ',
              createdAt: l.createdAt || Date.now(),
              updatedAt: l.updatedAt || Date.now()
            }));
          }
          setState(rawDraft);
          if (rawDraft.staffName && rawDraft.staffName.trim() && isValidStaffName(rawDraft.staffName)) {
            setIsEditingName(false);
          } else {
            setIsEditingName(true);
          }
        }

        const rawReports = await DBService.getAllReports();
        if (rawReports) {
          setHistory(rawReports);
        }

        const rawLogs = await DBService.getSyncLogs();
        if (rawLogs) {
          setSyncLogs(rawLogs);
        }

        const fields = await DBService.loadCustomFields();
        if (fields) {
          setCustomFields(fields);
        }
      } catch (err) {
        console.error('Error loading initialization data from IndexedDB:', err);
      }
    }

    loadInitialData();
  }, []);



  // Compute Warnings (3 consecutive days of 0 results per item)
  useEffect(() => {
    if (!history || history.length === 0) return;
    const newWarnings: string[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Filter history excluding today to look at the last 2 days
    const pastRecords = history
      .filter((h) => h.date !== todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2);
    
    if (pastRecords.length >= 2) {
      WARNING_ITEMS.forEach((item) => {
        // @ts-ignore
        const todayVal = Number(state[item.group]?.[item.key]) || 0;
        const day1Val = Number(pastRecords[0]?.data?.[item.group]?.[item.key]) || 0;
        const day2Val = Number(pastRecords[1]?.data?.[item.group]?.[item.key]) || 0;
        
        if (todayVal === 0 && day1Val === 0 && day2Val === 0) {
          newWarnings.push(`Nhóm ${item.name} đã liên tục 3 ngày không có kết quả khai thác!`);
        }
      });
    }
    setWarnings(newWarnings);
  }, [state, history]);

  // Overdue leads status update reminder (> 2 hours since creation and still "Chưa liên hệ")
  useEffect(() => {
    const checkOverdueLeads = () => {
      if (!state.leads || state.leads.length === 0) return;
      const now = Date.now();
      const overdue = state.leads.filter(l => {
        const status = l.status || 'Chưa liên hệ';
        if (status !== 'Chưa liên hệ') return false;
        const created = l.createdAt || now;
        return (now - created) > 2 * 60 * 60 * 1000;
      });
      if (overdue.length > 0) {
        toast.error(
          `⚠️ Nhắc nhở: Có ${overdue.length} khách hàng chưa cập nhật trạng thái quá 2h!`,
          {
            duration: 6000,
            id: 'overdue-leads-reminder'
          }
        );
      }
    };

    checkOverdueLeads();
    const interval = setInterval(checkOverdueLeads, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [state.leads]);

  // Sync state helper that writes to database instantly on update
  const handleStateChange = (updater: (prev: ReportState) => ReportState) => {
    setState((prev) => {
      const next = updater(prev);
      DBService.saveDraft(next);
      return next;
    });
  };

  // Calculations for current form values (no cumulative)
  const totalRevenue = parseFloat(state.cash) || 0;
  const totalInstallment = parseFloat(state.installment) || 0;
  const totalInsurance = parseFloat(state.services.insurance) || 0;

  const efficiency = useCallback(() => {
    const total = totalRevenue;
    if (total === 0) return 0;
    return (totalInstallment / total) * 100;
  }, [totalRevenue, totalInstallment]);

  const handleStep = (category: 'products' | 'household' | 'accessories' | 'services', key: string, step: number) => {
    handleStateChange((prev) => ({
      ...prev,
      [category]: {
        // @ts-ignore
        ...prev[category],
        // @ts-ignore
        [key]: Math.max(0, (prev[category][key] || 0) + step),
      }
    }));
  };

  const clearAll = async () => {
    try {
      await DBService.clearAllData();
      setState(initialState);
      setHistory([]);
      const rawLogs = await DBService.getSyncLogs();
      setSyncLogs(rawLogs);
      setShowClearConfirm(false);
      toast.success('Đã xoá sạch toàn bộ dữ liệu trong IndexedDB!');
    } catch (e) {
      toast.error('Có lỗi xảy ra khi xoá dữ liệu.');
    }
  };



  const getFmt = (val: any) => (val === 0 || val === "" || val === '0') ? " " : val;

  const getVietTextReport = (data: typeof state) => {
    const now = new Date();
    const total = parseFloat(data.cash) || 0;
    const inst = parseFloat(data.installment) || 0;
    const cash = Math.max(0, total - inst);
    const eff = total > 0 ? Math.round((inst / total) * 100) : 0;

    let r = `📊 BÁO CÁO KHAI THÁC\n\n`;

    // Doanh thu multi-line list
    if (total > 0) {
      const formattedCash = parseFloat(cash.toFixed(2));
      r += `💰 Doanh thu: ${total}tr\n`;
      r += `   - T.Mặt: ${formattedCash}tr\n`;
      r += `   - T.Chậm: ${inst}Tr ~ ${eff}% | Mở Ví: ${data.moVi ? '✓' : '✗'}\n`;
    }

    // Sản phẩm - 1 dòng
    const prods: string[] = [];
    if (data.products.tivi > 0) prods.push(`Tivi: ${data.products.tivi}`);
    if (data.products.tuLanh > 0) prods.push(`TL: ${data.products.tuLanh}`);
    if (data.products.mayGiat > 0) prods.push(`MG: ${data.products.mayGiat}`);
    if (data.products.mayLanh > 0) prods.push(`ML: ${data.products.mayLanh}`);
    if (data.products.smpTab > 0) prods.push(`SMP: ${data.products.smpTab}`);
    if (data.products.laptop > 0) prods.push(`LT: ${data.products.laptop}`);
    customFields.filter(f => f.group === 'products').forEach(f => {
      const val = data.products[f.id];
      if (val > 0) prods.push(`${f.name}: ${val}`);
    });
    if (data.products.otherName.trim() && data.products.otherCount > 0) {
      prods.push(`${data.products.otherName}: ${data.products.otherCount}`);
    }
    if (prods.length > 0) r += `📦 S.Phẩm: ${prods.join(' | ')}\n`;

    // Dịch vụ bổ sung - 1 dòng
    const svcs: string[] = [];
    const viNum = parseFloat(data.services.vi) || 0;
    if (viNum > 0) svcs.push(`Ví: ${data.services.vi}`);
    if (data.services.vieon > 0) svcs.push(`Vieon: ${data.services.vieon}`);
    if (data.services.sim > 0) svcs.push(`SIM: ${data.services.sim}`);
    if (data.services.dongHo > 0) svcs.push(`ĐH: ${data.services.dongHo}`);
    const insNum = parseFloat(data.services.insurance) || 0;
    if (insNum > 0) svcs.push(`BH: ${data.services.insurance}`);
    customFields.filter(f => f.group === 'services').forEach(f => {
      const val = data.services[f.id];
      if (f.type === 'count' && val > 0) {
        svcs.push(`${f.name}: ${val}`);
      } else if (f.type === 'revenue' && parseFloat(val) > 0) {
        svcs.push(`${f.name}: ${val}`);
      }
    });
    if (svcs.length > 0) r += `🛠 D.Vụ: ${svcs.join(' | ')}\n`;

    // Phụ kiện - 1 dòng
    const accs: string[] = [];
    if (data.accessories.camera > 0) accs.push(`Cam: ${data.accessories.camera}`);
    if (data.accessories.sdp > 0) accs.push(`SDP: ${data.accessories.sdp}`);
    if (data.accessories.den > 0) accs.push(`Đèn: ${data.accessories.den}`);
    if (data.accessories.loa > 0) accs.push(`Loa: ${data.accessories.loa}`);
    customFields.filter(f => f.group === 'accessories').forEach(f => {
      const val = data.accessories[f.id];
      if (val > 0) accs.push(`${f.name}: ${val}`);
    });
    if (data.accessories.otherName?.trim() && data.accessories.otherCount > 0) {
      accs.push(`${data.accessories.otherName}: ${data.accessories.otherCount}`);
    }
    if (accs.length > 0) r += `🎧 P.Kiện: ${accs.join(' | ')}\n`;

    // Điện gia dụng - 1 dòng
    const houses: string[] = [];
    if (data.household.mln > 0) houses.push(`MLN: ${data.household.mln}`);
    if (data.household.qdh > 0) houses.push(`QĐH: ${data.household.qdh}`);
    if (data.household.quat > 0) houses.push(`Quạt: ${data.household.quat}`);
    if (data.household.noiCom > 0) houses.push(`N.Cơm: ${data.household.noiCom}`);
    if (data.household.noiChien > 0) houses.push(`N.Chiên: ${data.household.noiChien}`);
    if (data.household.locKk > 0) houses.push(`LKK: ${data.household.locKk}`);
    customFields.filter(f => f.group === 'household').forEach(f => {
      const val = data.household[f.id];
      if (val > 0) houses.push(`${f.name}: ${val}`);
    });
    if (data.household.otherName.trim() && data.household.otherCount > 0) {
      houses.push(`${data.household.otherName}: ${data.household.otherCount}`);
    }
    if (houses.length > 0) r += `🏠 G.Dụng: ${houses.join(' | ')}\n`;

    // Chiến giá
    if (data.showPriceWar) {
      r += `⚔️ Chiến giá: ✓\n`;
    }

    // Ghi chú - double line break before notes
    if (data.notes?.trim()) {
      r += `\n📝 ${data.notes.trim()}\n`;
    }

    return r.trim();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Đã copy văn bản báo cáo!'))
      .catch(() => toast.error('Lỗi sao chép, vui lòng thử lại.'));
  };

  const currentFormattedReport = getVietTextReport(state);

  const handleCopyAndSaveProcess = async () => {
    if (!state.staffName.trim()) {
      toast.error('Vui lòng điền Tên Nhân Viên trước khi báo cáo!');
      setIsEditingName(true);
      return;
    }
    if (!isValidStaffName(state.staffName)) {
      toast.error('Vui lòng nhập đúng định dạng "Số - Tên" (Ví dụ: 21707 - Sơn)!');
      setIsEditingName(true);
      return;
    }

    // Capture current values to avoid referencing the reset state during asynchronous execution
    const todayStr = new Date().toISOString().slice(0, 10);
    const capturedStaffName = state.staffName;

    const totalInput = parseFloat(state.cash) || 0;
    const instInput = parseFloat(state.installment) || 0;
    const calculatedCash = Math.max(0, totalInput - instInput);
    const cashStr = calculatedCash > 0 ? parseFloat(calculatedCash.toFixed(2)).toString() : '';

    const finalReport = {
      date: todayStr,
      staffName: capturedStaffName,
      cash: cashStr, // Stored as the cash portion for database compatibility
      installment: state.installment,
      moVi: state.moVi,
      showPriceWar: state.showPriceWar,
      products: { ...state.products },
      household: { ...state.household },
      services: { ...state.services },
      accessories: { ...state.accessories },
      priceWar: { ...state.priceWar },
      leads: [...state.leads],
      synced: false,
      syncedAt: new Date().toISOString()
    };

    // 1. Copy formatted report to clipboard
    const textReport = getVietTextReport(state);
    copyToClipboard(textReport);

    // 2. Save report to Local IndexedDB
    try {
      await DBService.saveReport(finalReport);
      const rawReports = await DBService.getAllReports();
      setHistory(rawReports);
      await DBService.addSyncLog('success', `Đã ghi nhận báo cáo vào bộ nhớ máy (IndexedDB)`);
      const rawLogs = await DBService.getSyncLogs();
      setSyncLogs(rawLogs);
    } catch (err) {
      console.error('Error saving local report:', err);
    }

    // Reset form draft locally immediately, preserving staffName and leads
    handleStateChange(prev => ({
      ...initialState,
      staffName: prev.staffName,
      leads: prev.leads
    }));
    setWarnings([]);
    toast.success('Đã lưu nháp local & làm sạch biểu mẫu để nhập tiếp đơn tiếp theo!', { icon: '🔄' });
  };

  // Leads query searching filter
  const filteredLeads = state.leads.filter(l => 
    l.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
    l.phone.includes(leadSearchQuery) ||
    l.product.toLowerCase().includes(leadSearchQuery.toLowerCase())
  );

  const getUnifiedData = (): any[] => {
    if (sheetRows && sheetRows.length > 0) {
      return sheetRows;
    } else {
      return history.map(item => {
        const row: any = {
          date: item.date || '',
          staffName: item.staffName || 'Bạn (Local)',
          cash: parseFloat(item.cash) || 0,
          installment: parseFloat(item.installment) || 0,
          moVi: item.moVi || false,
          showPriceWar: item.showPriceWar || false,
          tivi: item.products?.tivi || 0,
          tuLanh: item.products?.tuLanh || 0,
          mayGiat: item.products?.mayGiat || 0,
          mayLanh: item.products?.mayLanh || 0,
          smpTab: item.products?.smpTab || 0,
          laptop: item.products?.laptop || 0,
          mln: item.household?.mln || 0,
          qdh: item.household?.qdh || 0,
          quat: item.household?.quat || 0,
          noiCom: item.household?.noiCom || 0,
          locKk: item.household?.locKk || 0,
          insurance: parseFloat(item.services?.insurance) || 0,
          vi: parseFloat(item.services?.vi) || 0,
          maintenance: parseFloat(item.services?.maintenance) || 0,
          vieon: item.services?.vieon || 0,
          sim: item.services?.sim || 0,
          camera: item.accessories?.camera || 0,
          sdp: item.accessories?.sdp || 0,
          loa: item.accessories?.loa || item.accessories?.taiNghe || 0,
          den: item.accessories?.den || 0,
          dongHo: item.services?.dongHo || item.accessories?.dongHo || 0,
        };

        // Map dynamic custom fields
        customFields.forEach(cf => {
          const val = item[cf.group]?.[cf.id];
          row[cf.id] = cf.type === 'count' ? (Number(val) || 0) : (parseFloat(val) || 0);
        });

        return row;
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F2F7] dark:bg-neutral-950 font-sans text-[#1C1C1E] dark:text-neutral-100 transition-colors duration-300 pb-20">
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          className: 'dark:bg-neutral-850 dark:text-white text-xs font-semibold rounded-2xl shadow-lg border border-neutral-200/30 dark:border-neutral-800',
          style: {
            fontSize: '12px',
          }
        }} 
      />

      {/* Header Bar */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-[#C6C6C8]/40 dark:border-neutral-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-[#007AFF] to-[#147efb] rounded-xl flex items-center justify-center text-white shadow-sm">
            <Tv size={18} className="stroke-[2.5px]" />
          </div>
          <div>
            <h1 className="font-bold text-[15px] tracking-tight leading-tight">Báo cáo bán hàng</h1>
            <p className="text-[10px] text-neutral-500 font-medium">Đánh giá hiệu quả trong từng đơn hàng</p>
          </div>
        </div>

        {/* Apple ID Styled User Badge */}
        <div className="flex items-center gap-1.5 bg-[#F2F2F7] dark:bg-neutral-800 p-1 px-2.5 rounded-full border border-neutral-200/50 dark:border-neutral-700/50">
          {isEditingName ? (
            <input 
              type="text" 
              autoFocus
              placeholder="Nhập User - Tên" 
              className="bg-transparent text-xs font-semibold text-[#1C1C1E] dark:text-neutral-100 border-none outline-none focus:ring-0 w-28 py-0"
              value={state.staffName}
              onChange={e => handleStateChange(p => ({ ...p, staffName: e.target.value }))}
              onBlur={() => { 
                if (state.staffName.trim()) {
                  if (isValidStaffName(state.staffName)) {
                    setIsEditingName(false);
                  } else {
                    toast.error('Vui lòng nhập đúng định dạng "Số - Tên" (Ví dụ: 21707 - Sơn)');
                  }
                } 
              }}
              onKeyDown={e => { 
                if (e.key === 'Enter' && state.staffName.trim()) {
                  if (isValidStaffName(state.staffName)) {
                    setIsEditingName(false);
                  } else {
                    toast.error('Vui lòng nhập đúng định dạng "Số - Tên" (Ví dụ: 21707 - Sơn)');
                  }
                } 
              }}
            />
          ) : (
            <span 
              className="text-xs font-semibold select-none cursor-pointer hover:text-[#007AFF] transition-colors truncate max-w-[100px]"
              onClick={() => setIsEditingName(true)}
              title="Chạm để đổi tên nhân viên"
            >
              👤 {state.staffName || 'Đổi tên NV'}
            </span>
          )}
        </div>
      </nav>

      {/* Main Tab Area */}
      <main className="flex-1 overflow-x-hidden p-3 max-w-lg mx-auto w-full space-y-2.5">
        
        {/* Urgent Warnings Alert block (If consecutive days have 0 output) */}
        {warnings.length > 0 && activeTab === 'report' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#FF9500]/15 border border-[#FF9500]/30 rounded-2xl p-3 flex gap-2.5"
          >
            <AlertCircle className="text-[#FF9500] stroke-[2.5px] shrink-0" size={18} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#D57B00]">CẢNH BÁO KHAI THÁC LIÊN TIẾP</h4>
              <ul className="text-[10.5px] font-medium text-[#D57B00]/95 space-y-0.5 list-disc list-inside">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          
          {/* --- Tab 1: REPORT ENTRY --- */}
          {activeTab === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              className="space-y-2.5"
            >
              {/* Doanh thu Card */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 p-3 shadow-sm space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-[#34C759] stroke-[2.5px]" />
                    <span className="text-xs font-bold text-[#8E8E93] dark:text-neutral-400 uppercase tracking-wide">Báo Cáo Doanh Thu (Tr)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full">
                      TỈ SUẤT CHẬM: {Math.round(efficiency())}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Tổng doanh thu đơn hàng</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      min="0"
                      placeholder="VD: 8.5 (8.5Tr)..." 
                      className="w-full text-xs font-semibold bg-transparent border-0 border-b border-neutral-200 dark:border-neutral-700 py-1 focus:ring-0 focus:border-[#007AFF] focus:outline-none"
                      value={state.cash}
                      onChange={e => handleStateChange(prev => ({ ...prev, cash: e.target.value }))}
                      onKeyDown={blockNonNumericKeys}
                    />
                  </div>
                  <div className="space-y-1 border-l border-neutral-100 dark:border-neutral-800 pl-4">
                    <label className="text-[10px] font-bold text-[#007AFF] uppercase">Trả chậm (Kèm Ví)</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      min="0"
                      placeholder="VD: 300k (0.3)..." 
                      className="w-full text-xs font-semibold text-[#007AFF] bg-transparent border-0 border-b border-neutral-200 dark:border-neutral-700 py-1 focus:ring-0 focus:border-[#007AFF] focus:outline-none"
                      value={state.installment}
                      onChange={e => handleStateChange(prev => ({ ...prev, installment: e.target.value }))}
                      onKeyDown={blockNonNumericKeys}
                    />
                  </div>
                </div>

                {/* Checkboxes row: Chiến giá (left) + Mở Ví (right, under Trả chậm) */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  {/* Chiến giá toggle - left column */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStateChange(prev => ({ ...prev, showPriceWar: !prev.showPriceWar }))}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        state.showPriceWar 
                          ? 'bg-[#FF3B30] border-[#FF3B30]' 
                          : 'border-neutral-300 dark:border-neutral-600'
                      }`}
                    >
                      {state.showPriceWar && <Check size={12} className="text-white stroke-[3px]" />}
                    </button>
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Chiến giá</span>
                    <Sword size={14} className="text-[#FF3B30]" />
                  </div>

                  {/* Mở Ví - right column, under Trả chậm */}
                  <div className="border-l border-neutral-100 dark:border-neutral-800 pl-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStateChange(prev => {
                          const nextMoVi = !prev.moVi;
                          return {
                            ...prev,
                            moVi: nextMoVi,
                            services: {
                              ...prev.services,
                              vi: nextMoVi ? (prev.services.vi || '0.3') : ''
                            }
                          };
                        })}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          state.moVi 
                            ? 'bg-[#007AFF] border-[#007AFF]' 
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}
                      >
                        {state.moVi && <Check size={12} className="text-white stroke-[3px]" />}
                      </button>
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Mở Ví</span>
                      <Wallet size={14} className="text-[#007AFF]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sản phẩm chính iOS Box */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-neutral-50/50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package size={15} className="text-[#007AFF]" />
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Sản phẩm chính</span>
                  </div>
                  <button 
                    onClick={() => setCustomFieldTargetGroup('products')}
                    className="p-1 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors cursor-pointer"
                    title="Thêm mục mới"
                  >
                    <Plus size={14} className="stroke-[3px]" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-neutral-800">
                  <IOSFormStepItem icon={<Tv size={16} />} label="Tivi" value={state.products.tivi} onMinus={() => handleStep('products', 'tivi', -1)} onPlus={() => handleStep('products', 'tivi', 1)} />
                  <IOSFormStepItem icon={<Refrigerator size={16} />} label="Tủ lạnh" value={state.products.tuLanh} onMinus={() => handleStep('products', 'tuLanh', -1)} onPlus={() => handleStep('products', 'tuLanh', 1)} />
                  <IOSFormStepItem icon={<WashingMachine size={16} />} label="Máy giặt" value={state.products.mayGiat} onMinus={() => handleStep('products', 'mayGiat', -1)} onPlus={() => handleStep('products', 'mayGiat', 1)} />
                  <IOSFormStepItem icon={<AirVent size={16} />} label="Máy lạnh" value={state.products.mayLanh} onMinus={() => handleStep('products', 'mayLanh', -1)} onPlus={() => handleStep('products', 'mayLanh', 1)} />
                  <IOSFormStepItem icon={<Smartphone size={16} />} label="SMP/TAB" value={state.products.smpTab} onMinus={() => handleStep('products', 'smpTab', -1)} onPlus={() => handleStep('products', 'smpTab', 1)} />
                  <IOSFormStepItem icon={<Laptop size={16} />} label="Laptop" value={state.products.laptop} onMinus={() => handleStep('products', 'laptop', -1)} onPlus={() => handleStep('products', 'laptop', 1)} />

                  {/* Custom Products */}
                  {customFields.filter(cf => cf.group === 'products').map((cf) => (
                    cf.type === 'count' ? (
                      <IOSFormStepItem 
                        key={cf.id} 
                        icon={<Package size={16} />} 
                        label={cf.name} 
                        value={state.products[cf.id] ?? 0} 
                        onMinus={() => handleStep('products', cf.id, -1)} 
                        onPlus={() => handleStep('products', cf.id, 1)} 
                        onDelete={() => handleDeleteCustomField(cf)}
                      />
                    ) : (
                      <div key={cf.id} className="bg-white dark:bg-neutral-900 px-3 py-2 space-y-1 relative group">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <Package size={13} className="text-neutral-400" />
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">{cf.name}</label>
                          </div>
                          <button
                            onClick={() => handleDeleteCustomField(cf)}
                            className="p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Xoá mục này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <input 
                          type="number" 
                          inputMode="decimal"
                          min="0"
                          placeholder="Nhập số..." 
                          className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#007AFF]"
                          value={state.products[cf.id] ?? ''}
                          onChange={e => handleStateChange(prev => ({
                            ...prev,
                            products: { ...prev.products, [cf.id]: e.target.value }
                          }))}
                          onKeyDown={blockNonNumericKeys}
                        />
                      </div>
                    )
                  ))}
                  
                  {/* Other Products Section */}
                  <div className="col-span-2 px-3 py-2 flex items-center justify-between gap-3 bg-neutral-50/30">
                    <input 
                      type="text" 
                      placeholder="Sản phẩm chính khác..." 
                      className="flex-1 text-xs bg-transparent dark:text-white border-0 border-b border-neutral-200 dark:border-neutral-700 py-0.5 focus:outline-none focus:ring-0 focus:border-[#007AFF]"
                      value={state.products.otherName}
                      onChange={e => handleStateChange(prev => ({ ...prev, products: { ...prev.products, otherName: e.target.value } }))}
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStep('products', 'otherCount', -1)} className="w-5.5 h-5.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-[#FF3B30] hover:text-white flex items-center justify-center transition-colors"><Minus size={11} /></button>
                      <span className="w-4 text-center text-xs font-bold">{state.products.otherCount}</span>
                      <button onClick={() => handleStep('products', 'otherCount', 1)} className="w-5.5 h-5.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-[#34C759] hover:text-white flex items-center justify-center transition-colors"><Plus size={11} /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dịch vụ bổ sung */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 overflow-hidden shadow-sm bg-[#34C759]/5">
                <div className="px-3 py-2 bg-neutral-50/50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-[#34C759]" />
                    <span className="text-xs font-bold text-[#248A3D] dark:text-neutral-400 uppercase tracking-wide">Dịch vụ bổ sung</span>
                  </div>
                  <button 
                    onClick={() => setCustomFieldTargetGroup('services')}
                    className="p-1 text-[#34C759] hover:bg-[#34C759]/10 rounded-lg transition-colors cursor-pointer"
                    title="Thêm mục mới"
                  >
                    <Plus size={14} className="stroke-[3px]" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-neutral-800">
                  <div className="bg-white dark:bg-neutral-900 px-3 py-2 space-y-1">
                    <div className="flex items-center gap-1">
                      <Wallet size={13} className="text-neutral-400" />
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Ví</label>
                    </div>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      min="0"
                      placeholder="VD: 300k (0.3)..." 
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#34C759]"
                      value={state.services.vi}
                      onChange={e => {
                        const val = e.target.value;
                        handleStateChange(prev => ({
                          ...prev,
                          moVi: parseFloat(val) > 0,
                          services: { ...prev.services, vi: val }
                        }));
                      }}
                      onKeyDown={blockNonNumericKeys}
                    />
                  </div>
                  <IOSFormStepItem icon={<Tv2 size={16} />} label="Vieon" value={state.services.vieon} onMinus={() => handleStep('services', 'vieon', -1)} onPlus={() => handleStep('services', 'vieon', 1)} />
                  <IOSFormStepItem icon={<Cpu size={16} />} label="SIM" value={state.services.sim} onMinus={() => handleStep('services', 'sim', -1)} onPlus={() => handleStep('services', 'sim', 1)} />
                  <IOSFormStepItem icon={<Watch size={16} />} label="Đồng hồ" value={state.services.dongHo} onMinus={() => handleStep('services', 'dongHo', -1)} onPlus={() => handleStep('services', 'dongHo', 1)} />

                  {/* Custom Services */}
                  {customFields.filter(cf => cf.group === 'services').map((cf) => (
                    cf.type === 'count' ? (
                      <IOSFormStepItem 
                        key={cf.id} 
                        icon={<ShieldCheck size={16} />} 
                        label={cf.name} 
                        value={state.services[cf.id] ?? 0} 
                        onMinus={() => handleStep('services', cf.id, -1)} 
                        onPlus={() => handleStep('services', cf.id, 1)} 
                        onDelete={() => handleDeleteCustomField(cf)}
                      />
                    ) : (
                      <div key={cf.id} className="bg-white dark:bg-neutral-900 px-3 py-2 space-y-1 relative group">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <ShieldCheck size={13} className="text-neutral-400" />
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">{cf.name}</label>
                          </div>
                          <button
                            onClick={() => handleDeleteCustomField(cf)}
                            className="p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Xoá mục này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <input 
                          type="number" 
                          inputMode="decimal"
                          min="0"
                          placeholder="Nhập số..." 
                          className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#34C759]"
                          value={state.services[cf.id] ?? ''}
                          onChange={e => handleStateChange(prev => ({
                            ...prev,
                            services: { ...prev.services, [cf.id]: e.target.value }
                          }))}
                          onKeyDown={blockNonNumericKeys}
                        />
                      </div>
                    )
                  ))}
                </div>

                <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Bảo hiểm (BHMR)</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      min="0"
                      placeholder="Nhập số..." 
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#34C759]"
                      value={state.services.insurance}
                      onChange={e => handleStateChange(prev => ({ ...prev, services: { ...prev.services, insurance: e.target.value } }))}
                      onKeyDown={blockNonNumericKeys}
                    />
                  </div>
                </div>
              </div>

              {/* Phụ kiện */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 overflow-hidden shadow-sm bg-[#AF52DE]/5">
                <div className="px-3 py-2 bg-neutral-50/50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Headphones size={15} className="text-[#AF52DE]" />
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Phụ kiện</span>
                  </div>
                  <button 
                    onClick={() => setCustomFieldTargetGroup('accessories')}
                    className="p-1 text-[#AF52DE] hover:bg-[#AF52DE]/10 rounded-lg transition-colors cursor-pointer"
                    title="Thêm mục mới"
                  >
                    <Plus size={14} className="stroke-[3px]" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-neutral-800">
                  <IOSFormStepItem icon={<Camera size={16} />} label="Cam" value={state.accessories.camera} onMinus={() => handleStep('accessories', 'camera', -1)} onPlus={() => handleStep('accessories', 'camera', 1)} />
                  <IOSFormStepItem icon={<BatteryCharging size={16} />} label="SDP" value={state.accessories.sdp} onMinus={() => handleStep('accessories', 'sdp', -1)} onPlus={() => handleStep('accessories', 'sdp', 1)} />
                  <IOSFormStepItem icon={<Lamp size={16} />} label="Đèn" value={state.accessories.den} onMinus={() => handleStep('accessories', 'den', -1)} onPlus={() => handleStep('accessories', 'den', 1)} />
                  <IOSFormStepItem icon={<Volume2 size={16} />} label="Loa" value={state.accessories.loa} onMinus={() => handleStep('accessories', 'loa', -1)} onPlus={() => handleStep('accessories', 'loa', 1)} />

                  {/* Custom Accessories */}
                  {customFields.filter(cf => cf.group === 'accessories').map((cf) => (
                    cf.type === 'count' ? (
                      <IOSFormStepItem 
                        key={cf.id} 
                        icon={<Headphones size={16} />} 
                        label={cf.name} 
                        value={state.accessories[cf.id] ?? 0} 
                        onMinus={() => handleStep('accessories', cf.id, -1)} 
                        onPlus={() => handleStep('accessories', cf.id, 1)} 
                        onDelete={() => handleDeleteCustomField(cf)}
                      />
                    ) : (
                      <div key={cf.id} className="bg-white dark:bg-neutral-900 px-3 py-2 space-y-1 relative group">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <Headphones size={13} className="text-neutral-400" />
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">{cf.name}</label>
                          </div>
                          <button
                            onClick={() => handleDeleteCustomField(cf)}
                            className="p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Xoá mục này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <input 
                          type="number" 
                          inputMode="decimal"
                          min="0"
                          placeholder="Nhập số..." 
                          className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#AF52DE]"
                          value={state.accessories[cf.id] ?? ''}
                          onChange={e => handleStateChange(prev => ({
                            ...prev,
                            accessories: { ...prev.accessories, [cf.id]: e.target.value }
                          }))}
                          onKeyDown={blockNonNumericKeys}
                        />
                      </div>
                    )
                  ))}
                  
                  {/* Phụ kiện khác */}
                  <div className="col-span-2 px-3 py-2 flex items-center justify-between gap-3 bg-neutral-50/30">
                    <input 
                      type="text" 
                      placeholder="Phụ kiện khác..." 
                      className="flex-1 text-xs bg-transparent dark:text-white border-0 border-b border-neutral-200 dark:border-neutral-700 py-0.5 focus:outline-none focus:ring-0 focus:border-[#AF52DE]"
                      value={state.accessories.otherName}
                      onChange={e => handleStateChange(prev => ({ ...prev, accessories: { ...prev.accessories, otherName: e.target.value } }))}
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStep('accessories', 'otherCount', -1)} className="w-5.5 h-5.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-[#FF3B30] hover:text-white flex items-center justify-center transition-colors"><Minus size={11} /></button>
                      <span className="w-4 text-center text-xs font-bold">{state.accessories.otherCount}</span>
                      <button onClick={() => handleStep('accessories', 'otherCount', 1)} className="w-5.5 h-5.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-[#34C759] hover:text-white flex items-center justify-center transition-colors"><Plus size={11} /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Điện gia dụng Section */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 overflow-hidden shadow-sm bg-[#FF9500]/5">
                <div className="px-3 py-2 bg-neutral-50/50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Fan size={15} className="text-[#FF9500]" />
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Điện gia dụng</span>
                  </div>
                  <button 
                    onClick={() => setCustomFieldTargetGroup('household')}
                    className="p-1 text-[#FF9500] hover:bg-[#FF9500]/10 rounded-lg transition-colors cursor-pointer"
                    title="Thêm mục mới"
                  >
                    <Plus size={14} className="stroke-[3px]" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-neutral-800">
                  <IOSFormStepItem icon={<Droplets size={16} />} label="Máy lọc nước" value={state.household.mln} onMinus={() => handleStep('household', 'mln', -1)} onPlus={() => handleStep('household', 'mln', 1)} />
                  <IOSFormStepItem icon={<Wind size={16} />} label="Quạt điều hoà" value={state.household.qdh} onMinus={() => handleStep('household', 'qdh', -1)} onPlus={() => handleStep('household', 'qdh', 1)} />
                  <IOSFormStepItem icon={<Fan size={16} />} label="Quạt gió" value={state.household.quat} onMinus={() => handleStep('household', 'quat', -1)} onPlus={() => handleStep('household', 'quat', 1)} />
                  <IOSFormStepItem icon={<Soup size={16} />} label="Nồi cơm" value={state.household.noiCom} onMinus={() => handleStep('household', 'noiCom', -1)} onPlus={() => handleStep('household', 'noiCom', 1)} />
                  <IOSFormStepItem icon={<CookingPot size={16} />} label="Nồi chiên" value={state.household.noiChien} onMinus={() => handleStep('household', 'noiChien', -1)} onPlus={() => handleStep('household', 'noiChien', 1)} />
                  <IOSFormStepItem icon={<Sparkles size={16} />} label="Máy lọc KK" value={state.household.locKk} onMinus={() => handleStep('household', 'locKk', -1)} onPlus={() => handleStep('household', 'locKk', 1)} />

                  {/* Custom Household */}
                  {customFields.filter(cf => cf.group === 'household').map((cf) => (
                    cf.type === 'count' ? (
                      <IOSFormStepItem 
                        key={cf.id} 
                        icon={<Fan size={16} />} 
                        label={cf.name} 
                        value={state.household[cf.id] ?? 0} 
                        onMinus={() => handleStep('household', cf.id, -1)} 
                        onPlus={() => handleStep('household', cf.id, 1)} 
                        onDelete={() => handleDeleteCustomField(cf)}
                      />
                    ) : (
                      <div key={cf.id} className="bg-white dark:bg-neutral-900 px-3 py-2 space-y-1 relative group">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <Fan size={13} className="text-neutral-400" />
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">{cf.name}</label>
                          </div>
                          <button
                            onClick={() => handleDeleteCustomField(cf)}
                            className="p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Xoá mục này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <input 
                          type="number" 
                          inputMode="decimal"
                          min="0"
                          placeholder="Nhập số..." 
                          className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF9500]"
                          value={state.household[cf.id] ?? ''}
                          onChange={e => handleStateChange(prev => ({
                            ...prev,
                            household: { ...prev.household, [cf.id]: e.target.value }
                          }))}
                          onKeyDown={blockNonNumericKeys}
                        />
                      </div>
                    )
                  ))}
                  
                  {/* Gia dụng khác */}
                  <div className="col-span-2 px-3 py-2 flex items-center justify-between gap-3 bg-neutral-50/30">
                    <input 
                      type="text" 
                      placeholder="Gia dụng khác..." 
                      className="flex-1 text-xs bg-transparent dark:text-white border-0 border-b border-neutral-200 dark:border-neutral-700 py-0.5 focus:outline-none focus:ring-0 focus:border-[#FF9500]"
                      value={state.household.otherName}
                      onChange={e => handleStateChange(prev => ({ ...prev, household: { ...prev.household, otherName: e.target.value } }))}
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStep('household', 'otherCount', -1)} className="w-5.5 h-5.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-[#FF3B30] hover:text-white flex items-center justify-center transition-colors"><Minus size={11} /></button>
                      <span className="w-4 text-center text-xs font-bold">{state.household.otherCount}</span>
                      <button onClick={() => handleStep('household', 'otherCount', 1)} className="w-5.5 h-5.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-[#34C759] hover:text-white flex items-center justify-center transition-colors"><Plus size={11} /></button>
                    </div>
                  </div>
                </div>
              </div>



              {/* Ghi chú */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 p-3 shadow-sm space-y-2">
                <div className="flex items-center gap-1.5">
                  <Info size={15} className="text-[#8E8E93]" />
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Ghi chú</span>
                </div>
                <textarea
                  placeholder="Nhập ghi chú..."
                  rows={3}
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#007AFF] resize-none"
                  value={state.notes}
                  onChange={e => handleStateChange(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleResetForm}
                  className="w-full py-3 bg-[#FFE5E5] hover:bg-[#FFCCCC] dark:bg-[#4A1C1C] dark:hover:bg-[#5A2222] text-[#FF3B30] rounded-2xl font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 active:scale-98 transition-transform border border-[#FF3B30]/20"
                >
                  <RotateCcw size={13} className="text-[#FF3B30]" />
                  RESET
                </button>
                <button 
                  onClick={handleCopyAndSaveProcess}
                  disabled={isSyncing}
                  className="w-full py-3 bg-[#D4F5D4] hover:bg-[#B8EBB8] dark:bg-[#1C3A1C] dark:hover:bg-[#224A22] text-[#248A3D] rounded-2xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-transform disabled:opacity-50 border border-[#34C759]/20"
                >
                  {isSyncing ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Copy size={14} />
                  )}
                  {isSyncing ? 'Đang gửi...' : 'Báo cáo'}
                </button>
              </div>
            </motion.div>
          )}

          {/* --- Tab 2: LEADS (KHÁCH HÀNG THÔNG TIN) --- */}
          {activeTab === 'leads' && (
            <motion.div
              key="leads"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Form to insert lead information */}
              <LeadsManager 
                leads={state.leads} 
                onAddLead={(lead) => {
                  const newLead = { 
                    ...lead, 
                    id: Date.now().toString(),
                    status: 'Chưa liên hệ',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                  } as LeadInfo;
                  handleStateChange(p => ({ ...p, leads: [...p.leads, newLead] }));
                  toast.success(`Đã thêm thông tin khách hàng ${lead.name}`);
                }}
                onRemoveLead={(id) => {
                  handleStateChange(p => ({ ...p, leads: p.leads.filter(l => l.id !== id) }));
                  toast.success('Đã xóa thông tin khách hàng!');
                }}
                onUpdateLead={(updatedLead) => {
                  handleStateChange(p => ({
                    ...p,
                    leads: p.leads.map(l => l.id === updatedLead.id ? updatedLead : l)
                  }));
                }}
              />
            </motion.div>
          )}

          {/* --- Tab 3: HISTORICAL SAVED DAY DATA --- */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm border border-neutral-200/50 dark:border-neutral-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5Header">
                    <History size={16} className="text-[#34C759] stroke-[2px]" />
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Nhật ký Lưu trữ ở IndexedDB</h3>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-400">
                    Ghi chép: {history.length} ngày
                  </span>
                </div>

                {/* Filter and Clear option */}
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="flex-1 bg-neutral-50 dark:bg-neutral-800 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 outline-none focus:border-[#007AFF]"
                      value={selectedDateFilter}
                      onChange={e => setSelectedDateFilter(e.target.value)}
                    />
                    {(selectedDateFilter || historySearchQuery) && (
                      <button 
                        onClick={() => {
                          setSelectedDateFilter('');
                          setHistorySearchQuery('');
                        }}
                        className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-xs rounded-xl font-semibold hover:text-red-500 transition-colors"
                      >
                        Xóa Lọc
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Tìm theo tên NV, doanh thu..."
                      className="w-full bg-neutral-50 dark:bg-neutral-800 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#007AFF]"
                      value={historySearchQuery}
                      onChange={e => setHistorySearchQuery(e.target.value)}
                    />
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
                    <History size={36} className="mx-auto text-neutral-300 stroke-[1.5px]" />
                    <p>Chưa có ngày báo cáo nào hoàn chỉnh được lưu trữ.</p>
                    <p className="text-[10px] text-neutral-400/80">Bấm Sao chép & Lưu báo cáo ở tab Báo Cáo để ghi nhận lịch sử ngày tại đây.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history
                      .filter(h => {
                        const matchesDate = !selectedDateFilter || h.date === selectedDateFilter;
                        const query = historySearchQuery.trim().toLowerCase();
                        if (!query) return matchesDate;
                        
                        const matchesStaff = (h.staffName || '').toLowerCase().includes(query);
                        const totalRev = (Number(h.cash) || 0) + (Number(h.installment) || 0);
                        const matchesRevenue = String(totalRev).includes(query);
                        
                        return matchesDate && (matchesStaff || matchesRevenue);
                      })
                      .sort((a, b) => {
                        const timeA = a.syncedAt || a.date || '';
                        const timeB = b.syncedAt || b.date || '';
                        return timeB.localeCompare(timeA);
                      })
                      .map((item, idx) => {
                        const isExpanded = expandedHistoryId === item.id;
                        
                         // Sum custom fields in products
                         let customProductsCount = 0;
                         customFields.filter(cf => cf.group === 'products' && cf.type === 'count').forEach(cf => {
                           customProductsCount += Number(item.products?.[cf.id]) || 0;
                         });

                        const totalProductsCount = 
                          (item.products?.tivi || 0) +
                          (item.products?.tuLanh || 0) +
                          (item.products?.mayGiat || 0) +
                          (item.products?.mayLanh || 0) +
                          (item.products?.smpTab || 0) +
                          (item.products?.laptop || 0) +
                          (item.products?.otherCount || 0) +
                          customProductsCount;

                         // Sum custom fields in household
                         let customHouseholdCount = 0;
                         customFields.filter(cf => cf.group === 'household' && cf.type === 'count').forEach(cf => {
                           customHouseholdCount += Number(item.household?.[cf.id]) || 0;
                         });

                        const totalHouseholdCount = 
                          (item.household?.mln || 0) +
                          (item.household?.qdh || 0) +
                          (item.household?.quat || 0) +
                          (item.household?.noiCom || 0) +
                          (item.household?.noiChien || 0) +
                          (item.household?.locKk || 0) +
                          (item.household?.otherCount || 0) +
                          customHouseholdCount;
 
                         // Sum custom fields in accessories
                         let customAccessoriesCount = 0;
                         customFields.filter(cf => cf.group === 'accessories' && cf.type === 'count').forEach(cf => {
                           customAccessoriesCount += Number(item.accessories?.[cf.id]) || 0;
                         });

                         const totalAccessoriesCount = 
                           (item.accessories?.camera || 0) +
                           (item.accessories?.sdp || 0) +
                           (item.accessories?.loa || item.accessories?.taiNghe || 0) +
                           (item.accessories?.den || 0) +
                           (item.accessories?.dongHo || 0) +
                           customAccessoriesCount;
 
                         const totalRevenue = (Number(item.cash) || 0) + (Number(item.installment) || 0);

                         // Parse updated date & time
                         const getFormattedDateTime = (isoStr: string, defaultDate: string) => {
                           if (!isoStr) {
                             const parts = defaultDate.split('-');
                             return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : defaultDate;
                           }
                           try {
                             const d = new Date(isoStr);
                             const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                             const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                             return `${datePart} lúc ${timePart}`;
                           } catch (e) {
                             return defaultDate;
                           }
                         };
                         const updatedTimeStr = getFormattedDateTime(item.syncedAt, item.date);
 
                         return (
                           <div 
                             key={item.id || idx} 
                             className="border border-neutral-100 dark:border-neutral-800/80 rounded-xl overflow-hidden shadow-xs bg-neutral-50/50 dark:bg-neutral-850"
                           >
                             <div 
                               className="px-3.5 py-3.5 flex flex-col gap-2 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800 transition-all select-none"
                               onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                             >
                               {/* First row: Revenue badge, Updated time, Staff name */}
                               <div className="flex items-center justify-between w-full">
                                 <div className="flex items-center gap-2">
                                   <span className="text-xs font-extrabold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-0.5 rounded-lg">
                                     Đơn {totalRevenue} Tr
                                   </span>
                                   <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                                     Cập nhật: {updatedTimeStr}
                                   </span>
                                   <span className="text-[10px] text-neutral-400 font-medium truncate max-w-[100px]">
                                     ({item.staffName || 'Bạn'})
                                   </span>
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                   <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-[#34C759]/10 text-[#34C759] flex items-center gap-0.5">
                                     Local 💾
                                   </span>
                                   <ChevronRight size={14} className={`text-neutral-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                 </div>
                               </div>
 
                               {/* Second row: Key metric summaries */}
                               <div className="flex flex-wrap gap-1.5 items-center text-[10px]">
                                 {/* Cash */}
                                 <div className="bg-[#007AFF]/5 text-[#007AFF] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                   <span>💵</span>
                                   <span>{(Number(item.cash) || 0)} Tr</span>
                                 </div>
                                 {/* Installment */}
                                 <div className="bg-[#34C759]/5 text-[#34C759] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                   <span>💳</span>
                                   <span>{(Number(item.installment) || 0)} Tr</span>
                                 </div>
                                 {/* Products sold */}
                                 {totalProductsCount > 0 && (
                                   <div className="bg-orange-500/5 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                     <span>📦</span>
                                     <span>{totalProductsCount} sp</span>
                                   </div>
                                 )}
                                 {/* Household items */}
                                 {totalHouseholdCount > 0 && (
                                   <div className="bg-amber-600/5 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                     <span>🏠</span>
                                     <span>{totalHouseholdCount} gia dụng</span>
                                   </div>
                                 )}
                                 {/* Accessories */}
                                 {totalAccessoriesCount > 0 && (
                                   <div className="bg-purple-500/5 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                     <span>🔌</span>
                                     <span>{totalAccessoriesCount} phụ kiện</span>
                                   </div>
                                 )}
                               </div>
                             </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 space-y-4 text-xs"
                                >
                                  {/* Cumulative summary display */}
                                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="bg-[#007AFF]/5 text-[#007AFF] px-2.5 py-2 rounded-xl">
                                      <p className="opacity-70 font-semibold uppercase text-[8.5px]">Tổng Tiền mặt</p>
                                      <p className="font-bold text-sm">{(Number(item.cash) || 0)} Tr</p>
                                    </div>
                                    <div className="bg-[#34C759]/5 text-[#34C759] px-2.5 py-2 rounded-xl">
                                      <p className="opacity-70 font-semibold uppercase text-[8.5px]">Tổng Trả chậm</p>
                                      <p className="font-bold text-sm">{(Number(item.installment) || 0)} Tr</p>
                                    </div>
                                  </div>

                                  {/* Detailed layout text wrapper to copy */}
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Mẫu báo cáo đầy đủ</p>
                                    <pre className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl font-mono text-[10.5px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                      {getVietTextReport(item)}
                                    </pre>
                                  </div>

                                  {/* Controls to sync again or delete */}
                                  <div className="grid grid-cols-3 gap-2">
                                    <button 
                                      onClick={() => copyToClipboard(getVietTextReport(item))}
                                      className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 rounded-xl font-bold text-[11px] text-neutral-700 dark:text-neutral-200 text-center flex items-center justify-center gap-1.5"
                                    >
                                      <Copy size={12} /> Sao chép
                                    </button>
                                    <button 
                                      onClick={() => {
                                        handleStateChange(() => ({
                                          ...initialState,
                                          staffName: item.staffName || '',
                                          cash: String(item.cash || ''),
                                          installment: String(item.installment || ''),
                                          moVi: item.moVi || false,
                                          showPriceWar: item.showPriceWar || false,
                                          products: item.products || initialState.products,
                                          household: item.household || initialState.household,
                                          services: item.services || initialState.services,
                                          accessories: item.accessories || initialState.accessories,
                                          priceWar: item.priceWar || initialState.priceWar,
                                          leads: item.leads || [],
                                          notes: item.notes || '',
                                        }));
                                        setActiveTab('report');
                                        toast.success('Đã tải lại báo cáo để chỉnh sửa!');
                                      }}
                                      className="py-2 px-3 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 rounded-xl font-bold text-[11px] text-[#007AFF] text-center flex items-center justify-center gap-1.5"
                                    >
                                      <Pencil size={12} /> Sửa lại
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if (confirm(`Bạn muốn xóa ngày lịch sử báo cáo ${item.date}?`)) {
                                          await DBService.deleteReport(item.id);
                                          const raw = await DBService.getAllReports();
                                          setHistory(raw);
                                          toast.success('Đã xóa dữ liệu lịch sử ngày thành công!');
                                          loadDashboardData();
                                        }
                                      }}
                                      className="py-2 px-3 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/25 rounded-xl font-bold text-[11px] text-[#FF3B30] text-center flex items-center justify-center gap-1.5"
                                    >
                                      <Trash2 size={12} /> Xóa
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* IndexedDB reset block warnings */}
              <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-2xl p-4 shadow-xs flex justify-between items-center">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-[#FF3B30]">Quản lý Bộ Nhớ IndexedDB</h4>
                  <p className="text-[9.5px] text-neutral-400">Đặt ứng dụng về trạng thái mới xuất xưởng ban đầu.</p>
                </div>
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3.5 py-1.5 bg-[#FF3B30] text-white hover:bg-[#d02c24] text-[10.5px] font-semibold rounded-xl"
                >
                  XÓA HẾT 💾
                </button>
              </div>
            </motion.div>
          )}


          {/* --- Tab 5: TEAM DASHBOARD (BIỂU ĐỒ NHÓM) --- */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              className="space-y-4 animate-fade-in"
            >
              {/* Header card with Time range filter and refresh action */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-550">
                      <BarChart3 size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[13.5px] text-neutral-800 dark:text-neutral-100 uppercase tracking-wide">Biểu đồ Cá nhân</h3>
                      <p className="text-[9.5px] text-neutral-400">Doanh số tích lũy & hiệu suất của bạn</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Time range controller */}
                    <div className="flex bg-neutral-1050 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/30">
                      <button
                        onClick={() => setDashboardTimeRange('today')}
                        className={`px-2.5 py-1 text-[9.5px] font-extrabold rounded-lg transition-all ${dashboardTimeRange === 'today' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-600'}`}
                      >
                        Hôm nay
                      </button>
                      <button
                        onClick={() => setDashboardTimeRange('week')}
                        className={`px-2.5 py-1 text-[9.5px] font-extrabold rounded-lg transition-all ${dashboardTimeRange === 'week' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-600'}`}
                      >
                        Tuần này
                      </button>
                    </div>

                    {/* Refresh action */}
                    <button
                      onClick={() => {
                        loadDashboardData();
                        toast.success('Đã làm mới dữ liệu mới nhất!');
                      }}
                      disabled={isLoadingDashboard}
                      className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-300 rounded-lg transition-colors border border-neutral-200/10 cursor-pointer"
                      title="Làm mới dữ liệu"
                    >
                      <RefreshCw size={12} className={isLoadingDashboard ? 'animate-spin' : ''} />
                    </button>

                    {/* Export Action */}
                    <button
                      onClick={() => handleExportAndShare('dashboard-capture-area', `bao-cao-bieu-do-${new Date().toISOString().slice(0, 10)}.png`)}
                      className="p-1.5 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] rounded-lg transition-colors border border-neutral-200/10 flex items-center justify-center cursor-pointer"
                      title="Xuất ảnh báo cáo"
                    >
                      <Share2 size={12} />
                    </button>
                  </div>
                </div>

              </div>

              {/* Data Loading state or empty indicators */}
              {isLoadingDashboard ? (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-10 shadow-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-[#007AFF]" />
                  <p className="text-xs text-neutral-400 italic">Đang tải dữ liệu báo cáo...</p>
                </div>
              ) : (() => {
                // Parse and aggregate report list
                const now = new Date();
                const todayStr = now.toISOString().slice(0, 10);
                
                // Helper to check if a date is in current week (Monday-Sunday)
                const isSameWeek = (dateStr: string) => {
                  const recordDate = new Date(dateStr);
                  if (isNaN(recordDate.getTime())) return false;
                  
                  // Today midnight
                  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const dayOfWeek = todayMidnight.getDay(); // 0 = Sunday, 1 = Monday... 6 = Saturday
                  
                  // Find Monday offset
                  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                  const monday = new Date(todayMidnight.getTime());
                  monday.setDate(todayMidnight.getDate() + mondayOffset);
                  monday.setHours(0,0,0,0);
                  
                  const sunday = new Date(monday.getTime());
                  sunday.setDate(monday.getDate() + 6);
                  sunday.setHours(23,59,59,999);
                  
                  const targetDate = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
                  return targetDate >= monday && targetDate <= sunday;
                };

                // Filter report rows
                const unified = getUnifiedData();
                const filtered = unified.filter(item => {
                  if (dashboardTimeRange === 'today') {
                    return item.date === todayStr;
                  } else {
                    return isSameWeek(item.date);
                  }
                });

                // Quantities aggregation
                const totalCash = filtered.reduce((s, r) => s + r.cash, 0);
                const totalInstallment = filtered.reduce((s, r) => s + r.installment, 0);
                const totalRevenueByRange = totalCash + totalInstallment;
                const efficiencyRate = totalRevenueByRange > 0 ? Math.round((totalInstallment / totalRevenueByRange) * 100) : 0;
                
                // Best accessories total count
                const totalInsuranceSum = filtered.reduce((s, r) => s + r.insurance, 0);
                const totalViSum = filtered.reduce((s, r) => s + (r.vi || 0), 0);
                const totalMoViCount = filtered.reduce((s, r) => s + (r.moVi ? 1 : 0), 0);
                const totalPriceWarCount = filtered.reduce((s, r) => s + (r.showPriceWar ? 1 : 0), 0);
                const totalMaintenanceSum = filtered.reduce((s, r) => s + r.maintenance, 0);
                const totalVieonSum = filtered.reduce((s, r) => s + r.vieon, 0);
                const totalSimSum = filtered.reduce((s, r) => s + r.sim, 0);
                
                const totalCameraSum = filtered.reduce((s, r) => s + r.camera, 0);
                const totalSdpSum = filtered.reduce((s, r) => s + r.sdp, 0);
                const totalLoaSum = filtered.reduce((s, r) => s + (r.loa || 0), 0);
                const totalDenSum = filtered.reduce((s, r) => s + r.den, 0);
                const totalDongHoSum = filtered.reduce((s, r) => s + r.dongHo, 0);

                // Products sales
                const productRatings = [
                  { name: 'Tivi', count: filtered.reduce((s, r) => s + r.tivi, 0), colorClass: 'bg-blue-500' },
                  { name: 'Tủ lạnh', count: filtered.reduce((s, r) => s + r.tuLanh, 0), colorClass: 'bg-green-500' },
                  { name: 'Máy giặt', count: filtered.reduce((s, r) => s + r.mayGiat, 0), colorClass: 'bg-amber-500' },
                  { name: 'Máy lạnh', count: filtered.reduce((s, r) => s + r.mayLanh, 0), colorClass: 'bg-cyan-500' },
                  { name: 'SMP / Tablet', count: filtered.reduce((s, r) => s + r.smpTab, 0), colorClass: 'bg-purple-500' },
                  { name: 'Laptop', count: filtered.reduce((s, r) => s + r.laptop, 0), colorClass: 'bg-pink-500' },
                ].sort((a, b) => b.count - a.count);

                const householdRatings = [
                  { name: 'Máy lọc nước (MLN)', count: filtered.reduce((s, r) => s + r.mln, 0), colorClass: 'bg-indigo-500' },
                  { name: 'Quạt điều hoà (QĐH)', count: filtered.reduce((s, r) => s + r.qdh, 0), colorClass: 'bg-teal-500' },
                  { name: 'Quạt thường', count: filtered.reduce((s, r) => s + r.quat, 0), colorClass: 'bg-orange-500' },
                  { name: 'Nồi cơm điện', count: filtered.reduce((s, r) => s + r.noiCom, 0), colorClass: 'bg-rose-500' },
                  { name: 'Máy lọc KK', count: filtered.reduce((s, r) => s + r.locKk, 0), colorClass: 'bg-emerald-500' },
                ].sort((a, b) => b.count - a.count);

                // Staff contribution leaderboard ranking
                const staffDict: { [name: string]: { cash: number; installment: number; orders: number } } = {};
                filtered.forEach(item => {
                  const sName = item.staffName.trim() || 'Ẩn danh';
                  if (!staffDict[sName]) {
                    staffDict[sName] = { cash: 0, installment: 0, orders: 0 };
                  }
                  staffDict[sName].cash += item.cash;
                  staffDict[sName].installment += item.installment;
                  staffDict[sName].orders += 1;
                });

                const leaderList = Object.entries(staffDict).map(([name, val]) => ({
                  name,
                  totalSales: val.cash + val.installment,
                  orders: val.orders,
                  cash: val.cash,
                  installment: val.installment
                })).sort((a, b) => b.totalSales - a.totalSales);

                const maxProductCount = Math.max(...productRatings.map(p => p.count), 1);
                const maxHouseCount = Math.max(...householdRatings.map(h => h.count), 1);

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-8 shadow-xs text-center">
                      <p className="text-xs text-neutral-400 italic">Chưa phát sinh dữ liệu đơn hàng cho khoảng thời gian này.</p>
                      <p className="text-[10px] text-neutral-400/70 mt-1">Hãy bắt đầu tạo đơn hàng và bấm Sao Chép Báo Cáo để ghi nhận dữ liệu!</p>
                    </div>
                  );
                }

                return (
                  <div id="dashboard-capture-area" className="space-y-4 p-3 bg-[#F2F2F7] dark:bg-neutral-950 rounded-2xl">
                    <div className="flex items-start justify-between pb-1.5 border-b border-neutral-200 dark:border-neutral-800 select-none">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Báo cáo doanh số cá nhân ({dashboardTimeRange === 'today' ? 'Hôm nay' : 'Tuần này'})</span>
                        {state.staffName && (
                          <span className="text-[9.5px] font-bold text-[#007AFF] dark:text-[#147efb] mt-0.5">
                            👤 NV: {state.staffName}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500">{new Date().toLocaleDateString('vi-VN')}</span>
                    </div>
                    
                    {/* KPI grid counts */}
                    <div className="grid grid-cols-4 gap-2">
                      
                      {/* Metric Card 1: Doanh số */}
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-2.5 shadow-xs space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[8px] font-extrabold text-neutral-400 uppercase tracking-wider block truncate">Tổng Doanh Số</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-base font-black text-neutral-900 dark:text-neutral-50">{totalRevenueByRange.toFixed(1)}</span>
                            <span className="text-[10px] font-bold text-neutral-400">Tr</span>
                          </div>
                        </div>
                        <div className="text-[8px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/60 pt-1 mt-1 truncate">
                          TM:<b>{totalCash.toFixed(1)}</b>|TC:<b>{totalInstallment.toFixed(1)}</b>
                        </div>
                      </div>

                      {/* Metric Card 2: Hiệu suất */}
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-2.5 shadow-xs space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[8px] font-extrabold text-neutral-400 uppercase tracking-wider block truncate">Hiệu Suất</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-base font-black text-[#34C759]">{efficiencyRate}</span>
                            <span className="text-[10px] font-bold text-[#34C759]/80">%</span>
                          </div>
                        </div>
                        <div className="text-[8px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/60 pt-1 mt-1 truncate">
                          Tổng:<b>{filtered.length}</b> đơn
                        </div>
                      </div>

                      {/* Metric Card 3: Mở ví */}
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-2.5 shadow-xs space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[8px] font-extrabold text-neutral-400 uppercase tracking-wider block truncate">Mở Ví</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-base font-black text-[#007AFF]">{totalMoViCount}</span>
                            <span className="text-[10px] font-bold text-neutral-400">cái</span>
                          </div>
                        </div>
                        <div className="text-[8px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/60 pt-1 mt-1 truncate">
                          Ví:<b>{totalViSum.toFixed(1)}Tr</b>
                        </div>
                      </div>

                      {/* Metric Card 4: Chiến */}
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-2.5 shadow-xs space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[8px] font-extrabold text-neutral-400 uppercase tracking-wider block truncate">Chiến</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-base font-black text-[#FF3B30]">{totalPriceWarCount}</span>
                            <span className="text-[10px] font-bold text-neutral-400">cái</span>
                          </div>
                        </div>
                        <div className="text-[8px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/60 pt-1 mt-1 truncate">
                          Chiến giá
                        </div>
                      </div>

                    </div>


                    {/* Highly performed main electronic products */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-4 shadow-xs space-y-3">
                      <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-850">
                        <TrendingUp size={15} className="text-[#007AFF]" />
                        <span className="text-xs font-extrabold uppercase text-neutral-500 tracking-wide">Sản phẩm chính bán chạy</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {productRatings.map((p, idx) => (
                          <div key={idx} className="bg-neutral-50 dark:bg-neutral-850 p-2 rounded-xl border border-neutral-200/10 flex flex-col justify-between h-14">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${p.colorClass} shrink-0`} />
                              <span className="text-[9.5px] font-bold text-neutral-500 dark:text-neutral-400 truncate" title={p.name}>{p.name}</span>
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-sm font-black text-neutral-900 dark:text-white">{p.count}</span>
                              <span className="text-[8.5px] font-semibold text-neutral-400">cái</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Smarthome Smart housewares products */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-4 shadow-xs space-y-3">
                      <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-850">
                        <TrendingUp size={15} className="text-[#34C759]" />
                        <span className="text-xs font-extrabold uppercase text-neutral-500 tracking-wide">Gia dụng bán chạy</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {householdRatings.map((h, idx) => (
                          <div key={idx} className="bg-neutral-50 dark:bg-neutral-850 p-2 rounded-xl border border-neutral-200/10 flex flex-col justify-between h-14">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${h.colorClass} shrink-0`} />
                              <span className="text-[9.5px] font-bold text-neutral-500 dark:text-neutral-400 truncate" title={h.name}>{h.name}</span>
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-sm font-black text-neutral-900 dark:text-white">{h.count}</span>
                              <span className="text-[8.5px] font-semibold text-neutral-400">cái</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Complementary Services & Accessories volume analysis */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-2xl p-4 shadow-xs space-y-3">
                      <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-850">
                        <Users size={15} className="text-purple-550" />
                        <span className="text-xs font-extrabold uppercase text-neutral-500 tracking-wide">Dịch vụ & Phụ kiện bổ trợ</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-neutral-50 dark:bg-neutral-850 p-2.5 rounded-xl border border-neutral-200/10 space-y-2">
                          <h4 className="font-extrabold text-[#007AFF] text-[10px] uppercase border-b border-neutral-200/10 pb-1">Dịch vụ</h4>
                          <table className="w-full text-[10.5px]">
                            <tbody>
                              <tr>
                                <td className="text-neutral-400 py-1">Ví:</td>
                                <td className="font-extrabold text-right">{totalViSum.toFixed(1)} Tr ({totalMoViCount} cái)</td>
                              </tr>
                              <tr>
                                <td className="text-neutral-400 py-1">Vieon:</td>
                                <td className="font-extrabold text-right">{totalVieonSum} tk</td>
                              </tr>
                              <tr>
                                <td className="text-neutral-400 py-1">Sim:</td>
                                <td className="font-extrabold text-right">{totalSimSum} cái</td>
                              </tr>
                              <tr>
                                <td className="text-neutral-400 py-1">BHMR:</td>
                                <td className="font-extrabold text-right">{totalInsuranceSum.toFixed(1)} Tr</td>
                              </tr>
                              <tr>
                                <td className="text-neutral-400 py-1">Bảo dưỡng:</td>
                                <td className="font-extrabold text-right">{totalMaintenanceSum} cái</td>
                              </tr>
                              {customFields.filter(cf => cf.group === 'services').map((cf, cIdx) => {
                                const sum = filtered.reduce((s, r) => s + (r[cf.id] || 0), 0);
                                return (
                                  <tr key={`custom-svc-${cIdx}`}>
                                    <td className="text-neutral-400 py-1 truncate max-w-[70px]" title={cf.name}>{cf.name}:</td>
                                    <td className="font-extrabold text-right">
                                      {cf.type === 'count' ? `${sum} cái` : `${sum.toFixed(1)} Tr`}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-850 p-2.5 rounded-xl border border-neutral-200/10 space-y-2">
                          <h4 className="font-extrabold text-[#34C759] text-[10px] uppercase border-b border-neutral-200/10 pb-1">Phụ kiện</h4>
                          <table className="w-full text-[10.5px]">
                            <tbody>
                              <tr>
                                <td className="text-neutral-400 py-1">Camera:</td>
                                <td className="font-extrabold text-right">{totalCameraSum} c</td>
                              </tr>
                              <tr>
                                <td className="text-neutral-400 py-1">Sạc đ.phòng:</td>
                                <td className="font-extrabold text-right">{totalSdpSum} c</td>
                              </tr>
                              <tr>
                                <td className="text-neutral-400 py-1">Loa:</td>
                                <td className="font-extrabold text-right">{totalLoaSum} c</td>
                              </tr>
                              <tr>
                                <td className="text-neutral-400 py-1">Đèn bàn:</td>
                                <td className="font-extrabold text-right">{totalDenSum} c</td>
                              </tr>
                              <tr>
                                <td className="text-neutral-400 py-1">Đồng hồ:</td>
                                <td className="font-extrabold text-right">{totalDongHoSum} c</td>
                              </tr>
                              {customFields.filter(cf => cf.group === 'accessories').map((cf, cIdx) => {
                                const sum = filtered.reduce((s, r) => s + (r[cf.id] || 0), 0);
                                return (
                                  <tr key={`custom-acc-${cIdx}`}>
                                    <td className="text-neutral-400 py-1 truncate max-w-[70px]" title={cf.name}>{cf.name}:</td>
                                    <td className="font-extrabold text-right">
                                      {cf.type === 'count' ? `${sum} c` : `${sum.toFixed(1)} Tr`}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()}

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-[#F9F9F9]/85 dark:bg-[#161616]/85 backdrop-blur-xl border-t border-[#C6C6C8]/30 dark:border-neutral-800/80 z-40 flex items-center justify-around px-1 shadow-inner">
        <IOSInterfaceTabButton label="Báo Cáo" active={activeTab === 'report'} icon={<Tv size={20} />} onClick={() => setActiveTab('report')} />
        <IOSInterfaceTabButton label="Khách" active={activeTab === 'leads'} icon={<UserPlus size={20} />} onClick={() => setActiveTab('leads')} />
        <IOSInterfaceTabButton label="Biểu đồ" active={activeTab === 'dashboard'} icon={<BarChart3 size={20} />} onClick={() => setActiveTab('dashboard')} />
        <IOSInterfaceTabButton label="Nhật Ký" active={activeTab === 'history'} icon={<History size={20} />} onClick={() => setActiveTab('history')} />
      </footer>

      {/* Custom Field creation Modal */}
      <AnimatePresence>
        {customFieldTargetGroup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-55"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-3xl p-5 w-full max-w-sm text-left space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <h3 className="font-extrabold text-[13px] uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Thêm danh mục mới</h3>
                <button 
                  onClick={() => setCustomFieldTargetGroup(null)}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Tên mục / sản phẩm</label>
                  <input 
                    type="text" 
                    placeholder="VD: Tai nghe chụp tai, Mở thẻ, v.v." 
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#007AFF] text-neutral-800 dark:text-white font-medium"
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Loại hiển thị & Tính toán</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => setNewFieldType('count')}
                      className={`py-2 px-3 border rounded-xl text-[10.5px] font-bold transition-all text-center cursor-pointer ${
                        newFieldType === 'count' 
                          ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]' 
                          : 'border-neutral-200 dark:border-neutral-850 text-neutral-450 dark:border-neutral-800'
                      }`}
                    >
                      Đếm số lượng (Cái)
                    </button>
                    <button
                      onClick={() => setNewFieldType('revenue')}
                      className={`py-2 px-3 border rounded-xl text-[10.5px] font-bold transition-all text-center cursor-pointer ${
                        newFieldType === 'revenue' 
                          ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]' 
                          : 'border-neutral-200 dark:border-neutral-850 text-neutral-455 dark:border-neutral-800'
                      }`}
                    >
                      Doanh thu / Tiền (Tr)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2 pt-2">
                <button 
                  onClick={() => setCustomFieldTargetGroup(null)}
                  className="py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 font-bold text-xs rounded-xl text-neutral-600 dark:text-neutral-300 text-center"
                >
                  Bỏ qua
                </button>
                <button 
                  onClick={handleAddCustomField}
                  className="py-2.5 bg-[#007AFF] hover:bg-[#007AFF]/90 font-bold text-xs rounded-xl text-white text-center shadow-xs"
                >
                  Lưu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Database Clear confirmation Modal dialog */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-3xl p-5 w-full max-w-sm text-center"
            >
              <div className="w-12 h-12 bg-[#FF3B30]/15 rounded-full flex items-center justify-center mx-auto mb-3.5 text-[#FF3B30]">
                <AlertCircle size={22} className="stroke-[2.5px]" />
              </div>
              <h3 className="font-extrabold text-[15px]">Khôi phục cài đặt gốc?</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Hành động này sẽ dọn sạch toàn bộ cơ sở dữ liệu nội bộ IndexedDB của ứng dụng (bao gồm các bản nháp chưa gửi, thông tin khách hàng, lịch sử báo cáo ngày cũ...). Bạn có chắc muốn tiếp tục không?
              </p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 font-bold text-xs rounded-xl"
                >
                  Bỏ qua
                </button>
                <button 
                  onClick={clearAll}
                  className="py-2.5 bg-[#FF3B30] text-white hover:bg-[#d02c24] font-bold text-xs rounded-xl"
                >
                  Đồng ý Xóa sạch!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- CORE ACCESSIBLE COMPONENTS ---

interface IOSFormStepItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  onDelete?: () => void;
}

function IOSFormStepItem({ icon, label, value, onMinus, onPlus, onDelete }: IOSFormStepItemProps) {
  return (
    <div className="px-3 py-2 flex items-center justify-between group bg-white dark:bg-neutral-900 transition-colors">
      <div className="flex items-center gap-3 overflow-hidden select-none flex-1">
        <div className="text-neutral-400 group-hover:text-[#007AFF] transition-colors shrink-0">{icon}</div>
        <span className="text-[12.5px] font-semibold text-[#1C1C1E] dark:text-neutral-100 truncate">{label}</span>
        {onDelete && (
          <button 
            onClick={onDelete}
            className="p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Xoá mục này"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2.5 bg-[#EEEEF0] dark:bg-neutral-850 p-1.5 rounded-full select-none shrink-0">
        <button 
          onClick={onMinus} 
          className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 text-[#1C1C1E] dark:text-white flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-transform shadow-xs"
        >
          <Minus size={11} className="stroke-[2.5px]" />
        </button>
        <span className="w-5 text-center text-[12.5px] font-extrabold text-[#1C1C1E] dark:text-neutral-100">{value}</span>
        <button 
          onClick={onPlus} 
          className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 text-[#1C1C1E] dark:text-white flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-transform shadow-xs"
        >
          <Plus size={11} className="stroke-[2.5px]" />
        </button>
      </div>
    </div>
  );
}

function IOSStepplet({ value, onMinus, onPlus }: { value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-[#EEEEF0] dark:bg-neutral-850 p-1 rounded-full shrink-0 select-none">
      <button onClick={onMinus} className="w-4.5 h-4.5 rounded-full bg-white dark:bg-neutral-850 text-neutral-600 dark:text-neutral-300 flex items-center justify-center active:scale-90"><Minus size={9} className="stroke-[2.5px]" /></button>
      <span className="w-3.5 text-center text-[11px] font-bold">{value}</span>
      <button onClick={onPlus} className="w-4.5 h-4.5 rounded-full bg-white dark:bg-neutral-850 text-neutral-600 dark:text-neutral-300 flex items-center justify-center active:scale-90"><Plus size={9} className="stroke-[2.5px]" /></button>
    </div>
  );
}



// Leads customer logic sub components
function LeadsManager({ 
  leads, onAddLead, onRemoveLead, onUpdateLead
}: { 
  leads: LeadInfo[]; 
  onAddLead: (lead: Omit<LeadInfo, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void; 
  onRemoveLead: (id: string) => void;
  onUpdateLead: (lead: LeadInfo) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [customProduct, setCustomProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  
  // Expanded status update editors state
  const [expandedStatusLeads, setExpandedStatusLeads] = useState<Record<string, boolean>>({});

  const handleProductCheckboxChange = (prod: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, prod]);
    } else {
      setSelectedProducts(prev => prev.filter(p => p !== prod));
    }
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Vui lòng điền tên khách hàng!');
      return;
    }
    if (!phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại liên lạc!');
      return;
    }

    const combinedProducts: string[] = [...selectedProducts];
    if (customProduct.trim()) {
      combinedProducts.push(customProduct.trim());
    }

    if (combinedProducts.length === 0) {
      toast.error('Vui lòng chọn hoặc nhập ít nhất một sản phẩm khách quan tâm!');
      return;
    }

    const productString = combinedProducts.join(', ');

    onAddLead({ 
      name: name.trim(), 
      phone: phone.trim(), 
      product: productString,
      notes: notes.trim()
    });

    setName('');
    setPhone('');
    setSelectedProducts([]);
    setCustomProduct('');
    setNotes('');
  };

  const filtered = leads.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.phone.includes(search) || 
    l.product.toLowerCase().includes(search.toLowerCase()) ||
    (l.status && l.status.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-none p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <UserPlus size={16} className="text-[#007AFF] stroke-[2px]" />
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Thu Thập Thông Tin Khách Hàng (Leads)</span>
      </div>

      {/* Input controls block */}
      <div className="space-y-3 bg-[#007AFF]/5 p-3 rounded-2xl border border-[#007AFF]/10">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-neutral-400">TÊN KHÁCH HÀNG</label>
            <input 
              type="text" 
              placeholder="Nguyễn Văn A..." 
              className="w-full text-xs font-semibold bg-white dark:bg-neutral-800 border-none rounded-xl p-2.5 focus:outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-neutral-400">SỐ ĐIỆN THOẠI</label>
            <input 
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="09xx..." 
              className="w-full text-xs font-semibold bg-white dark:bg-neutral-800 border-none rounded-xl p-2.5 focus:outline-none"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        {/* 2-Column Product Checkbox Grid */}
        <div className="space-y-1.5">
          <label className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wide block">SẢN PHẨM KHÁCH QUAN TÂM</label>
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-100 dark:border-neutral-750/30 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'tivi', label: 'Tivi' },
                { id: 'tulanh', label: 'Tủ lạnh' },
                { id: 'maygiat', label: 'Máy giặt' },
                { id: 'maylanh', label: 'Máy lạnh' },
                { id: 'smptab', label: 'SMP/Tab' },
                { id: 'laptop', label: 'Laptop' }
              ].map(p => (
                <label 
                  key={p.id} 
                  className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none"
                >
                  <input 
                    type="checkbox"
                    className="rounded text-[#007AFF] focus:ring-[#007AFF] w-4 h-4 border-neutral-300 dark:border-neutral-700"
                    checked={selectedProducts.includes(p.label)}
                    onChange={(e) => handleProductCheckboxChange(p.label, e.target.checked)}
                  />
                  {p.label}
                </label>
              ))}
            </div>

            {/* Custom product input inside the same white box, under checkboxes */}
            <div className="space-y-1 pt-2.5 border-t border-neutral-100 dark:border-neutral-700/60">
              <label className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wide">Sản phẩm khác:</label>
              <input 
                type="text" 
                placeholder="Nhập sản phẩm khác nếu có..." 
                className="w-full text-xs font-semibold bg-[#EEEEF0] dark:bg-neutral-850 border-none rounded-xl p-2.5 focus:outline-none"
                value={customProduct}
                onChange={e => setCustomProduct(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Notes input group */}
        <div className="space-y-1">
          <label className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wide">GHI CHÚ</label>
          <textarea 
            placeholder="Nhập ghi chú khách hàng..." 
            className="w-full text-xs font-semibold bg-white dark:bg-neutral-800 border-none rounded-xl p-2.5 focus:outline-none min-h-[50px] resize-none"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Add button */}
        <div className="flex justify-end pt-1">
          <button 
            onClick={handleAdd}
            className="w-full h-[37px] bg-[#007AFF] text-white hover:bg-[#147efb] rounded-xl font-bold text-xs active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1"
          >
            <Plus size={14} className="stroke-[2.5px]" /> Thêm
          </button>
        </div>
      </div>

      {/* Filter leads listings */}
      <div id="leads-capture-area" className="space-y-2.5 p-3 bg-[#F2F2F7] dark:bg-neutral-950 rounded-2xl">
        <div className="flex justify-between items-center select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col gap-0.5">
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Danh sách Khách Hàng ({leads.length})</h4>
              {state.staffName && (
                <span className="text-[9.5px] font-bold text-[#007AFF] dark:text-[#147efb]">
                  👤 NV: {state.staffName}
                </span>
              )}
            </div>
            {leads.length > 0 && (
              <button
                onClick={() => handleExportAndShare('leads-capture-area', `danh-sach-khach-hang-${new Date().toISOString().slice(0, 10)}.png`)}
                className="p-1 px-2.5 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-[9.5px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                title="Xuất ảnh báo cáo danh sách khách"
              >
                <Share2 size={10} /> Xuất ảnh
              </button>
            )}
          </div>
          {leads.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-2 py-1 rounded-full border border-neutral-200/20 max-w-[150px]">
              <Search size={10} className="text-neutral-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Tìm nhanh..." 
                className="bg-transparent text-[10px] w-full border-none p-0 outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Overdue Alert banner inside component */}
        {leads.filter(l => {
          const status = l.status || 'Chưa liên hệ';
          if (status !== 'Chưa liên hệ') return false;
          const created = l.createdAt || Date.now();
          return (Date.now() - created) > 2 * 60 * 60 * 1000;
        }).length > 0 && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 p-3 rounded-2xl flex items-start gap-2">
            <AlertCircle size={15} className="text-[#FF3B30] shrink-0 mt-0.5" />
            <div className="text-[10.5px] text-[#FF3B30] dark:text-[#FF453A] font-semibold">
              Nhắc nhở: Có khách hàng trong danh sách quá 2h chưa cập nhật trạng thái chăm sóc!
            </div>
          </div>
        )}

        {leads.length === 0 ? (
          <p className="text-center py-6 text-xs text-neutral-400 italic">Hiện tại chưa có thông tin khách hàng nào được ghi nhận.</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-4 text-xs text-neutral-400 italic bg-neutral-50 dark:bg-[#1C1C1E] rounded-xl">Không tìm thấy khách hàng phù hợp.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filtered.map((l, index) => {
              const currentStatus = displayStatus(l.status);
              const isOverdue = currentStatus === 'Chưa liên hệ' && (Date.now() - (l.createdAt || Date.now())) > 2 * 60 * 60 * 1000;
              const isExpanded = !!expandedStatusLeads[l.id];

              let badgeBg = 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/25';
              if (currentStatus === 'Đã liên hệ') badgeBg = 'bg-[#007AFF]/10 text-[#007AFF]';
              else if (currentStatus === 'Đã chốt') badgeBg = 'bg-[#34C759]/10 text-[#34C759]';
              else if (currentStatus === 'Tham khảo') badgeBg = 'bg-[#FF9500]/10 text-[#FF9500]';
              else if (currentStatus === 'Từ chối') badgeBg = 'bg-[#A2A2A7]/10 text-[#A2A2A7]';

              return (
                <div 
                  key={l.id || index} 
                  className="bg-neutral-50 dark:bg-neutral-850 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0 mr-2 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-neutral-400">#{index+1}</span>
                        <span className="text-xs font-bold text-[#1C1C1E] dark:text-neutral-100 truncate">{l.name}</span>
                        
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full select-none ${badgeBg}`}>
                          {currentStatus}
                        </span>
                        
                        {isOverdue && (
                          <span className="text-[8.5px] font-bold text-[#FF3B30] animate-pulse">
                            ⚠️ Quá 2h chưa cập nhật
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                        <span className="font-mono text-[#007AFF] font-semibold">{l.phone}</span>
                        {l.product && (
                          <span className="text-neutral-400 truncate bg-neutral-200/50 dark:bg-neutral-750 p-0.5 px-1.5 rounded text-[9px] font-medium max-w-[150px]" title={l.product}>
                            {l.product}
                          </span>
                        )}
                      </div>

                      {l.notes && (
                        <p className="text-[9.5px] text-neutral-400 dark:text-neutral-500 italic mt-0.5 bg-white dark:bg-neutral-900/50 p-1 rounded-lg">
                          <span className="font-semibold not-italic">Ghi chú:</span> {l.notes}
                        </p>
                      )}

                      {l.statusDetails && (currentStatus === 'Đã liên hệ' || currentStatus === 'Từ chối' || currentStatus === 'Đã chốt') && (
                        <p className="text-[9.5px] text-[#007AFF] bg-[#007AFF]/5 dark:bg-[#007AFF]/10 p-1 rounded-lg mt-0.5">
                          <span className="font-semibold">
                            {currentStatus === 'Đã liên hệ' ? 'Trao đổi:' : currentStatus === 'Đã chốt' ? 'Chốt:' : 'Lý do:'}
                          </span> {l.statusDetails}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      <a 
                        href={`tel:${l.phone}`}
                        className="p-1.5 bg-[#34C759]/10 rounded-full text-[#34C759] hover:bg-[#34C759]/20 transition-all flex items-center justify-center cursor-pointer"
                        title="Gọi Zalo/Điện thoại"
                      >
                        <Phone size={13} className="stroke-[2.5px]" />
                      </a>
                      <a 
                        href={`https://zalo.me/${l.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-[#007AFF]/10 rounded-full text-[#007AFF] hover:bg-[#007AFF]/20 transition-all text-[9px] font-black uppercase flex items-center justify-center shrink-0 cursor-pointer"
                        title="Mở chat Zalo"
                      >
                        Zalo
                      </a>

                      <button 
                        onClick={() => setExpandedStatusLeads(prev => ({ ...prev, [l.id]: !prev[l.id] }))}
                        className={`p-1.5 px-2.5 rounded-full transition-all text-[9px] font-black uppercase flex items-center justify-center shrink-0 cursor-pointer ${
                          isExpanded 
                            ? 'bg-[#007AFF] text-white shadow-xs' 
                            : 'bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20'
                        }`}
                        title="Cập nhật trạng thái"
                      >
                        Cập nhật
                      </button>

                      <button 
                        onClick={() => onRemoveLead(l.id)}
                        className="p-1.5 text-neutral-300 hover:text-[#FF3B30] transition-colors flex items-center justify-center cursor-pointer"
                        title="Xóa khách hàng"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Status Toggle & Select options */}
                  {isExpanded && (
                    <div className="pt-1.5 border-t border-neutral-100 dark:border-neutral-800/60 mt-1">
                      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-2 rounded-xl space-y-2">
                        <span className="block text-[8.5px] font-bold text-neutral-400 uppercase tracking-wide">Chọn trạng thái chăm sóc:</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['Chưa liên hệ', 'Đã liên hệ', 'Đã chốt', 'Tham khảo', 'Từ chối'] as const).map((st) => (
                            <label 
                              key={st} 
                              className="flex items-center gap-1.5 text-[9.5px] font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none"
                            >
                              <input 
                                type="radio"
                                name={`status-${l.id}`}
                                className="text-[#007AFF] focus:ring-[#007AFF] w-3 h-3"
                                checked={currentStatus === st}
                                onChange={() => {
                                  onUpdateLead({
                                    ...l,
                                    status: st,
                                    statusDetails: (st === 'Đã liên hệ' || st === 'Từ chối' || st === 'Đã chốt') ? (l.statusDetails || '') : '',
                                    updatedAt: Date.now()
                                  });
                                }}
                              />
                              {st}
                            </label>
                          ))}
                        </div>

                        {(currentStatus === 'Đã liên hệ' || currentStatus === 'Từ chối' || currentStatus === 'Đã chốt') && (
                          <div className="space-y-1 pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                            <label className="block text-[8.5px] font-bold text-[#007AFF] uppercase tracking-wide">
                              {currentStatus === 'Đã liên hệ' ? 'Nội dung trao đổi:' : currentStatus === 'Đã chốt' ? 'Thông tin chốt (ví dụ: giao chiều, cọc 500k...):' : 'Lý do từ chối:'}
                            </label>
                            <input 
                              type="text"
                              placeholder={currentStatus === 'Đã liên hệ' ? 'Nhập nội dung trao đổi...' : currentStatus === 'Đã chốt' ? 'Nhập thông tin chốt...' : 'Nhập lý do từ chối...'}
                              className="w-full text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl p-2 focus:outline-none"
                              value={l.statusDetails || ''}
                              onChange={(e) => {
                                onUpdateLead({
                                  ...l,
                                  statusDetails: e.target.value,
                                  updatedAt: Date.now()
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface IOSInterfaceTabButtonProps {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

function IOSInterfaceTabButton({ label, active, icon, onClick }: IOSInterfaceTabButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 h-full select-none cursor-pointer group active:scale-95 transition-transform ${active ? 'text-[#007AFF]' : 'text-[#8E8E93] dark:text-neutral-500'}`}
    >
      <div className="transform group-hover:scale-105 transition-all">
        {icon}
      </div>
      <span className="text-[10.5px] font-semibold mt-1 leading-none tracking-tight">
        {label}
      </span>
    </button>
  );
}
