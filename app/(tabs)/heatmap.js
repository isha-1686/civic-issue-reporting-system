import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, RefreshControl, Modal, TextInput, Image } from 'react-native';
import { Filter, MapPin, TrendingUp, Calendar, BarChart3, Layers, Navigation, Menu, User, Bell, Search, X, Send, MessageSquare, Eye, ThumbsUp, Clock, Star } from 'lucide-react-native';
import { getUserIssues, getCurrentUser, getUserProfile, createFeedback, getUserFeedback } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export default function HeatmapScreen() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userIssues, setUserIssues] = useState([]);
  const [userFeedback, setUserFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeTab, setActiveTab] = useState('heatmap');
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'suggestion',
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const statusFilters = [
    { id: 'all', label: 'All Issues', color: '#0EA5E9', icon: '📊' },
    { id: 'pending', label: 'Pending', color: '#F59E0B', icon: '⏳' },
    { id: 'acknowledged', label: 'Acknowledged', color: '#3B82F6', icon: '👁️' },
    { id: 'in_progress', label: 'In Progress', color: '#8B5CF6', icon: '🔄' },
    { id: 'resolved', label: 'Resolved', color: '#10B981', icon: '✅' },
  ];

  const periodFilters = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: '3 Months' },
    { id: 'year', label: 'This Year' },
  ];

  const feedbackTypes = [
    { id: 'suggestion', label: 'Suggestion', color: '#10B981', icon: '💡' },
    { id: 'complaint', label: 'Complaint', color: '#EF4444', icon: '⚠️' },
    { id: 'compliment', label: 'Compliment', color: '#8B5CF6', icon: '👍' },
    { id: 'inquiry', label: 'Inquiry', color: '#F59E0B', icon: '❓' },
  ];

  const tabs = [
    { id: 'heatmap', label: 'Issue Map', icon: MapPin },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ];

  useEffect(() => {
    loadData();
  }, [selectedFilter, selectedPeriod, selectedLocation]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { user: currentUser, error: userError } = await getCurrentUser();
      if (userError) throw userError;
      setUser(currentUser);

      if (currentUser) {
        // Get user profile
        const { data: profileData, error: profileError } = await getUserProfile(currentUser.id);
        if (profileError) throw profileError;
        setProfile(profileData);

        // Get user's issues
        const { data: issuesData, error: issuesError } = await getUserIssues();
        if (issuesError) throw issuesError;
        setUserIssues(issuesData || []);

        // Get user's feedback
        const { data: feedbackData, error: feedbackError } = await getUserFeedback();
        if (feedbackError) throw feedbackError;
        setUserFeedback(feedbackData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.subject || !feedbackForm.message) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmittingFeedback(true);

      const feedbackData = {
        user_id: user?.id,
        type: feedbackForm.type,
        subject: feedbackForm.subject,
        message: feedbackForm.message,
        priority: feedbackForm.priority,
        contact_email: profile?.email,
        status: 'pending'
      };

      const { error } = await createFeedback(feedbackData);
      if (error) throw error;

      Alert.alert(
        'Success',
        'Your feedback has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowFeedbackModal(false);
              setFeedbackForm({
                type: 'suggestion',
                subject: '',
                message: '',
                priority: 'medium'
              });
              loadData(); // Refresh feedback list
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Filter issues by selected criteria
  const filteredIssues = userIssues.filter(issue => {
    const matchesStatus = selectedFilter === 'all' || issue.status === selectedFilter;
    const matchesLocation = selectedLocation === 'all' || 
      issue.area === selectedLocation || 
      issue.ward === selectedLocation ||
      issue.location_name?.includes(selectedLocation);

    // Period filter
    const now = new Date();
    let dateFrom = null;
    switch (selectedPeriod) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const matchesPeriod = !dateFrom || new Date(issue.created_at) >= dateFrom;

    return matchesStatus && matchesLocation && matchesPeriod;
  });

  // Get unique locations for filter
  const uniqueLocations = [...new Set(userIssues.map(issue => 
    issue.area || issue.ward || issue.location_name
  ).filter(Boolean))];

  // Calculate location-based stats
  const locationStats = uniqueLocations.map(location => {
    const locationIssues = filteredIssues.filter(issue => 
      issue.area === location || 
      issue.ward === location || 
      issue.location_name?.includes(location)
    );

    return {
      location,
      count: locationIssues.length,
      resolved: locationIssues.filter(i => i.status === 'resolved').length,
      pending: locationIssues.filter(i => i.status === 'pending').length,
      categories: [...new Set(locationIssues.map(i => i.category))]
    };
  }).sort((a, b) => b.count - a.count);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      acknowledged: '#3B82F6',
      in_progress: '#8B5CF6',
      resolved: '#10B981',
    };
    return colors[status] || '#6B7280';
  };

  const getCategoryColor = (category) => {
    const colors = {
      roads: '#EF4444',
      utilities: '#F59E0B',
      environment: '#10B981',
      safety: '#8B5CF6',
      parks: '#06B6D4',
    };
    return colors[category] || '#6B7280';
  };

  const renderNavbar = () => (
    <LinearGradient
      colors={['#0EA5E9', '#0284C7', '#0369A1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.navbar}
    >
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => setShowSidebar(true)}
      >
        <Menu size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.navCenter}>
        <Text style={styles.navTitle}>Issue Analytics</Text>
        <Text style={styles.navSubtitle}>{filteredIssues.length} issues tracked</Text>
      </View>

      <TouchableOpacity style={styles.avatarButton}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Text>
        </View>
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderSidebar = () => (
    <Modal
      visible={showSidebar}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSidebar(false)}
    >
      <View style={styles.sidebarOverlay}>
        <View style={styles.sidebar}>
          <LinearGradient
            colors={['#0EA5E9', '#0284C7']}
            style={styles.sidebarHeader}
          >
            <View style={styles.sidebarUserInfo}>
              <View style={styles.sidebarAvatar}>
                <Text style={styles.sidebarAvatarText}>
                  {profile?.first_name?.charAt(0) || 'U'}
                </Text>
              </View>
              <View>
                <Text style={styles.sidebarUserName}>
                  {profile?.full_name || 'User'}
                </Text>
                <Text style={styles.sidebarUserType}>
                  {profile?.user_type === 'user' ? 'Citizen' : profile?.user_type}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeSidebar}
              onPress={() => setShowSidebar(false)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.sidebarContent}>
            <TouchableOpacity style={styles.sidebarItem}>
              <MapPin size={20} color="#0EA5E9" />
              <Text style={styles.sidebarItemText}>My Issues</Text>
              <View style={styles.sidebarBadge}>
                <Text style={styles.sidebarBadgeText}>{userIssues.length}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem}>
              <TrendingUp size={20} color="#10B981" />
              <Text style={styles.sidebarItemText}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem}>
              <MessageSquare size={20} color="#8B5CF6" />
              <Text style={styles.sidebarItemText}>Feedback</Text>
              <View style={styles.sidebarBadge}>
                <Text style={styles.sidebarBadgeText}>{userFeedback.length}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem}>
              <Bell size={20} color="#F59E0B" />
              <Text style={styles.sidebarItemText}>Notifications</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <LinearGradient
              colors={isActive ? ['#0EA5E9', '#0284C7'] : ['transparent', 'transparent']}
              style={styles.tabGradient}
            >
              <IconComponent size={18} color={isActive ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Status Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            {statusFilters.map((filter) => {
              const count = filter.id === 'all' 
                ? userIssues.length 
                : userIssues.filter(i => i.status === filter.id).length;
              
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(filter.id)}
                >
                  <LinearGradient
                    colors={selectedFilter === filter.id ? ['#0EA5E9', '#0284C7'] : ['#F8FAFC', '#F1F5F9']}
                    style={styles.filterChipGradient}
                  >
                    <Text style={styles.filterIcon}>{filter.icon}</Text>
                    <Text style={[
                      styles.filterChipText,
                      selectedFilter === filter.id && styles.filterChipTextActive
                    ]}>
                      {filter.label}
                    </Text>
                    <View style={[
                      styles.filterBadge,
                      { backgroundColor: selectedFilter === filter.id ? '#FFFFFF' : filter.color }
                    ]}>
                      <Text style={[
                        styles.filterBadgeText,
                        { color: selectedFilter === filter.id ? '#0EA5E9' : '#FFFFFF' }
                      ]}>
                        {count}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Location Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Location</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[
                styles.locationChip,
                selectedLocation === 'all' && styles.locationChipActive,
              ]}
              onPress={() => setSelectedLocation('all')}
            >
              <Text style={[
                styles.locationChipText,
                selectedLocation === 'all' && styles.locationChipTextActive
              ]}>
                All Locations
              </Text>
            </TouchableOpacity>
            {uniqueLocations.map((location) => (
              <TouchableOpacity
                key={location}
                style={[
                  styles.locationChip,
                  selectedLocation === location && styles.locationChipActive,
                ]}
                onPress={() => setSelectedLocation(location)}
              >
                <Text style={[
                  styles.locationChipText,
                  selectedLocation === location && styles.locationChipTextActive
                ]}>
                  {location}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Period Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Time Period</Text>
        <View style={styles.periodButtons}>
          {periodFilters.map((period) => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodButton,
                selectedPeriod === period.id && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <LinearGradient
                colors={selectedPeriod === period.id ? ['#0EA5E9', '#0284C7'] : ['#F8FAFC', '#F1F5F9']}
                style={styles.periodButtonGradient}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period.id && styles.periodButtonTextActive
                ]}>
                  {period.label}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderHeatmapContent = () => (
    <ScrollView style={styles.content}>
      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <LinearGradient colors={['#0EA5E9', '#0284C7']} style={styles.statCard}>
          <View style={styles.statIcon}>
            <MapPin size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.statNumber}>{filteredIssues.length}</Text>
          <Text style={styles.statLabel}>Total Issues</Text>
        </LinearGradient>

        <LinearGradient colors={['#10B981', '#059669']} style={styles.statCard}>
          <View style={styles.statIcon}>
            <TrendingUp size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.statNumber}>
            {filteredIssues.filter(i => i.status === 'resolved').length}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </LinearGradient>

        <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.statCard}>
          <View style={styles.statIcon}>
            <Clock size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.statNumber}>
            {filteredIssues.filter(i => i.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </LinearGradient>

        <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.statCard}>
          <View style={styles.statIcon}>
            <BarChart3 size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.statNumber}>{uniqueLocations.length}</Text>
          <Text style={styles.statLabel}>Locations</Text>
        </LinearGradient>
      </View>

      {/* Location Heatmap */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Location Hotspots</Text>
          <Text style={styles.sectionSubtitle}>Issues by location</Text>
        </View>

        <View style={styles.heatmapContainer}>
          {locationStats.slice(0, 8).map((location, index) => {
            const intensity = location.count > 5 ? 'high' : location.count > 2 ? 'medium' : 'low';
            const intensityColors = {
              high: ['#EF4444', '#DC2626'],
              medium: ['#F59E0B', '#D97706'],
              low: ['#10B981', '#059669']
            };

            return (
              <TouchableOpacity key={location.location} style={styles.heatmapItem}>
                <LinearGradient
                  colors={intensityColors[intensity]}
                  style={styles.heatmapCard}
                >
                  <View style={styles.heatmapHeader}>
                    <Text style={styles.heatmapLocation}>{location.location}</Text>
                    <View style={styles.heatmapBadge}>
                      <Text style={styles.heatmapBadgeText}>{location.count}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.heatmapStats}>
                    <View style={styles.heatmapStat}>
                      <Text style={styles.heatmapStatNumber}>{location.resolved}</Text>
                      <Text style={styles.heatmapStatLabel}>Resolved</Text>
                    </View>
                    <View style={styles.heatmapStat}>
                      <Text style={styles.heatmapStatNumber}>{location.pending}</Text>
                      <Text style={styles.heatmapStatLabel}>Pending</Text>
                    </View>
                  </View>

                  <View style={styles.heatmapCategories}>
                    {location.categories.slice(0, 3).map((category, idx) => (
                      <View key={idx} style={styles.categoryDot}>
                        <Text style={styles.categoryDotText}>
                          {category.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Recent Issues Timeline */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.sectionSubtitle}>Your latest reports</Text>
        </View>

        <View style={styles.timeline}>
          {filteredIssues.slice(0, 6).map((issue, index) => (
            <View key={issue.id} style={styles.timelineItem}>
              <View style={styles.timelineMarker}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: getStatusColor(issue.status) }
                ]} />
                {index < filteredIssues.slice(0, 6).length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>

              <View style={styles.timelineContent}>
                <View style={styles.timelineCard}>
                  <View style={styles.timelineHeader}>
                    <View style={styles.timelineMeta}>
                      <View style={[
                        styles.timelineCategory,
                        { backgroundColor: getCategoryColor(issue.category) + '20' }
                      ]}>
                        <Text style={[
                          styles.timelineCategoryText,
                          { color: getCategoryColor(issue.category) }
                        ]}>
                          {issue.category}
                        </Text>
                      </View>
                      <Text style={styles.timelineDate}>{formatDate(issue.created_at)}</Text>
                    </View>
                  </View>

                  <Text style={styles.timelineTitle}>{issue.title}</Text>
                  <Text style={styles.timelineDescription} numberOfLines={2}>
                    {issue.description}
                  </Text>

                  {issue.location_name && (
                    <View style={styles.timelineLocation}>
                      <MapPin size={12} color="#64748B" />
                      <Text style={styles.timelineLocationText}>{issue.location_name}</Text>
                    </View>
                  )}

                  <View style={styles.timelineFooter}>
                    <View style={[
                      styles.timelineStatus,
                      { backgroundColor: getStatusColor(issue.status) + '20' }
                    ]}>
                      <Text style={[
                        styles.timelineStatusText,
                        { color: getStatusColor(issue.status) }
                      ]}>
                        {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                      </Text>
                    </View>
                    
                    <View style={styles.timelineActions}>
                      <View style={styles.timelineAction}>
                        <Eye size={12} color="#64748B" />
                        <Text style={styles.timelineActionText}>{issue.views_count || 0}</Text>
                      </View>
                      <View style={styles.timelineAction}>
                        <ThumbsUp size={12} color="#64748B" />
                        <Text style={styles.timelineActionText}>{issue.upvotes || 0}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderFeedbackContent = () => (
    <ScrollView style={styles.content}>
      {/* Feedback Header */}
      <View style={styles.feedbackHeader}>
        <LinearGradient
          colors={['#0EA5E9', '#0284C7']}
          style={styles.feedbackHeaderGradient}
        >
          <View style={styles.feedbackHeaderContent}>
            <Text style={styles.feedbackHeaderTitle}>Share Your Thoughts</Text>
            <Text style={styles.feedbackHeaderSubtitle}>
              Help us improve our services
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addFeedbackButton}
            onPress={() => setShowFeedbackModal(true)}
          >
            <Send size={20} color="#0EA5E9" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Feedback Stats */}
      <View style={styles.feedbackStats}>
        <View style={styles.feedbackStatCard}>
          <Text style={styles.feedbackStatNumber}>{userFeedback.length}</Text>
          <Text style={styles.feedbackStatLabel}>Total Feedback</Text>
        </View>
        <View style={styles.feedbackStatCard}>
          <Text style={styles.feedbackStatNumber}>
            {userFeedback.filter(f => f.status === 'responded').length}
          </Text>
          <Text style={styles.feedbackStatLabel}>Responded</Text>
        </View>
        <View style={styles.feedbackStatCard}>
          <Text style={styles.feedbackStatNumber}>
            {userFeedback.filter(f => f.status === 'pending').length}
          </Text>
          <Text style={styles.feedbackStatLabel}>Pending</Text>
        </View>
      </View>

      {/* Feedback List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Feedback History</Text>
        
        {userFeedback.length === 0 ? (
          <View style={styles.emptyFeedback}>
            <MessageSquare size={48} color="#94A3B8" />
            <Text style={styles.emptyFeedbackTitle}>No feedback yet</Text>
            <Text style={styles.emptyFeedbackText}>
              Share your thoughts to help improve our services
            </Text>
          </View>
        ) : (
          <View style={styles.feedbackList}>
            {userFeedback.map((feedback) => (
              <View key={feedback.id} style={styles.feedbackCard}>
                <View style={styles.feedbackCardHeader}>
                  <View style={styles.feedbackType}>
                    <Text style={styles.feedbackTypeIcon}>
                      {feedbackTypes.find(t => t.id === feedback.type)?.icon || '📝'}
                    </Text>
                    <Text style={[
                      styles.feedbackTypeText,
                      { color: feedbackTypes.find(t => t.id === feedback.type)?.color || '#6B7280' }
                    ]}>
                      {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.feedbackDate}>{formatDate(feedback.created_at)}</Text>
                </View>

                <Text style={styles.feedbackSubject}>{feedback.subject}</Text>
                <Text style={styles.feedbackMessage} numberOfLines={3}>
                  {feedback.message}
                </Text>

                {feedback.admin_response && (
                  <View style={styles.adminResponse}>
                    <View style={styles.adminResponseHeader}>
                      <MessageSquare size={14} color="#10B981" />
                      <Text style={styles.adminResponseTitle}>Admin Response</Text>
                    </View>
                    <Text style={styles.adminResponseText}>{feedback.admin_response}</Text>
                    <Text style={styles.adminResponseDate}>
                      {formatDate(feedback.responded_at)}
                    </Text>
                  </View>
                )}

                <View style={styles.feedbackFooter}>
                  <View style={[
                    styles.feedbackStatus,
                    { backgroundColor: getStatusColor(feedback.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.feedbackStatusText,
                      { color: getStatusColor(feedback.status) }
                    ]}>
                      {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                    </Text>
                  </View>
                  
                  {feedback.priority && (
                    <View style={styles.feedbackPriority}>
                      <Star size={12} color="#F59E0B" />
                      <Text style={styles.feedbackPriorityText}>
                        {feedback.priority.charAt(0).toUpperCase() + feedback.priority.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderFeedbackModal = () => (
    <Modal
      visible={showFeedbackModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFeedbackModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#0EA5E9', '#0284C7']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Submit Feedback</Text>
            <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalForm}>
            {/* Feedback Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Feedback Type</Text>
              <View style={styles.typeSelector}>
                {feedbackTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      feedbackForm.type === type.id && styles.typeOptionActive,
                    ]}
                    onPress={() => setFeedbackForm({ ...feedbackForm, type: type.id })}
                  >
                    <Text style={styles.typeOptionIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.typeOptionText,
                      feedbackForm.type === type.id && { color: type.color }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Subject */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subject *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Brief subject of your feedback"
                value={feedbackForm.subject}
                onChangeText={(text) => setFeedbackForm({ ...feedbackForm, subject: text })}
              />
            </View>

            {/* Message */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Message *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Detailed message about your feedback..."
                value={feedbackForm.message}
                onChangeText={(text) => setFeedbackForm({ ...feedbackForm, message: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Priority */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.prioritySelector}>
                {['low', 'medium', 'high'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      feedbackForm.priority === priority && styles.priorityOptionActive,
                    ]}
                    onPress={() => setFeedbackForm({ ...feedbackForm, priority })}
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      feedbackForm.priority === priority && styles.priorityOptionTextActive
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFeedbackModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitButton, submittingFeedback && styles.modalSubmitButtonDisabled]}
              onPress={handleSubmitFeedback}
              disabled={submittingFeedback}
            >
              <LinearGradient
                colors={['#0EA5E9', '#0284C7']}
                style={styles.modalSubmitGradient}
              >
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitText}>
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#0EA5E9', '#0284C7']}
          style={styles.loadingGradient}
        >
          <BarChart3 size={48} color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F0F9FF', '#E0F2FE', '#F8FAFC']}
        style={styles.backgroundGradient}
      >
        {renderNavbar()}
        {renderSidebar()}
        {renderTabBar()}
        
        <ScrollView
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderFilters()}
          {activeTab === 'heatmap' ? renderHeatmapContent() : renderFeedbackContent()}
        </ScrollView>

        {renderFeedbackModal()}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  menuButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  navSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  sidebar: {
    width: width * 0.8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  sidebarUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarAvatar: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  sidebarUserName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sidebarUserType: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  closeSidebar: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  sidebarItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  sidebarBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  sidebarBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  filterIcon: {
    fontSize: 14,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationChipActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  locationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  locationChipTextActive: {
    color: '#FFFFFF',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  periodButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  heatmapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heatmapItem: {
    width: (width - 80) / 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heatmapCard: {
    padding: 16,
    minHeight: 120,
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heatmapLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  heatmapBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heatmapBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heatmapStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heatmapStat: {
    alignItems: 'center',
  },
  heatmapStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heatmapStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  heatmapCategories: {
    flexDirection: 'row',
    gap: 4,
  },
  categoryDot: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryDotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineMarker: {
    alignItems: 'center',
    paddingTop: 8,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineHeader: {
    marginBottom: 12,
  },
  timelineMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCategory: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timelineCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timelineDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  timelineDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  timelineLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  timelineLocationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  timelineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timelineStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineActions: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timelineActionText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  feedbackHeader: {
    marginBottom: 20,
  },
  feedbackHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
  },
  feedbackHeaderContent: {
    flex: 1,
  },
  feedbackHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedbackHeaderSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  addFeedbackButton: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  feedbackStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  feedbackStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  feedbackStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  emptyFeedback: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFeedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyFeedbackText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackList: {
    gap: 16,
  },
  feedbackCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackTypeIcon: {
    fontSize: 14,
  },
  feedbackTypeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  feedbackSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  adminResponse: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  adminResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  adminResponseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  adminResponseText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    marginBottom: 6,
  },
  adminResponseDate: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '500',
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  feedbackStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackPriority: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackPriorityText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalForm: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
  },
  typeOptionIcon: {
    fontSize: 14,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  priorityOptionActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  priorityOptionTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSubmitButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});