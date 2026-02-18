import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import apiService from '../../services/api';

interface PaymentProofScreenParams {
  transactionId: string;
  amount: number;
  groupName: string;
  bankName?: string;
  accountNumber?: string;
}

type Props = NativeStackScreenProps<any, 'PaymentProof'>;

export default function PaymentProofScreen({ route, navigation }: Props) {
  const { transactionId, amount, groupName, bankName, accountNumber } = 
    route.params as PaymentProofScreenParams;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Upload Payment Proof',
    });
  }, [navigation]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please grant camera and photo library permissions to upload payment proof.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async (useCamera: boolean) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    };

    let result;
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        ...options,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
    }

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setUploaded(false);
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add payment proof',
      [
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Gallery', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleUpload = async () => {
    if (!imageUri) {
      Alert.alert('No Image', 'Please select or take a photo of your payment proof.');
      return;
    }

    setUploading(true);
    try {
      // Create form data for file upload
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'payment-proof.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('paymentProof', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await apiService.post(
        `/payments/transactions/${transactionId}/proof`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setUploaded(true);
        Alert.alert(
          'Upload Successful',
          'Your payment proof has been uploaded. The treasurer will verify it shortly.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Upload Failed', response.data.message || 'Failed to upload payment proof');
      }
    } catch (error: any) {
      console.error('Failed to upload payment proof:', error);
      Alert.alert(
        'Upload Failed',
        error.response?.data?.message || 'Failed to upload payment proof. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Payment Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Payment Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Group:</Text>
          <Text style={styles.infoValue}>{groupName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Amount:</Text>
          <Text style={styles.amountValue}>R {amount.toFixed(2)}</Text>
        </View>
        {bankName && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bank:</Text>
            <Text style={styles.infoValue}>{bankName}</Text>
          </View>
        )}
        {accountNumber && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account:</Text>
            <Text style={styles.infoValue}>{accountNumber}</Text>
          </View>
        )}
      </View>

      {/* Upload Instructions */}
      <View style={styles.instructionsCard}>
        <Ionicons name="information-circle" size={24} color={colors.info} />
        <Text style={styles.instructionsText}>
          Please upload a clear photo of your payment confirmation (bank receipt, EFT confirmation, 
          or mobile payment screenshot). Make sure the amount, date, and reference are visible.
        </Text>
      </View>

      {/* Image Preview/Upload Area */}
      <TouchableOpacity
        style={[styles.uploadArea, imageUri && styles.uploadAreaWithImage]}
        onPress={showImagePickerOptions}
        disabled={uploading}
      >
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <View style={styles.imageOverlay}>
              <Ionicons name="camera" size={24} color={colors.white} />
              <Text style={styles.changeImageText}>Tap to change</Text>
            </View>
          </View>
        ) : (
          <View style={styles.uploadPlaceholder}>
            <View style={styles.uploadIconContainer}>
              <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.uploadTitle}>Upload Payment Proof</Text>
            <Text style={styles.uploadSubtext}>
              Take a photo or choose from gallery
            </Text>
            <View style={styles.optionsRow}>
              <View style={styles.optionBadge}>
                <Ionicons name="camera-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.optionText}>Camera</Text>
              </View>
              <View style={styles.optionBadge}>
                <Ionicons name="images-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.optionText}>Gallery</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Upload Button */}
      {imageUri && (
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading || uploaded}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.uploadButtonText}>Uploading...</Text>
            </>
          ) : uploaded ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.uploadButtonText}>Uploaded Successfully</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color={colors.white} />
              <Text style={styles.uploadButtonText}>Upload Proof</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Cancel Button */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  instructionsText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  uploadArea: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  uploadAreaWithImage: {
    borderStyle: 'solid',
    borderColor: colors.primary,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  uploadSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  optionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  optionText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  imageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  changeImageText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
});
