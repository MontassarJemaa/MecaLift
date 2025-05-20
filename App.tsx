import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, Dimensions, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { JoyStick } from 'react-native-virtual-joystick';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ESP32Service, { ESP32State, ForkCommand } from './services/ESP32Service';

// Interface for movement commands
interface MovementCommand {
  x: number;
  y: number;
}

// Interface for forklift state
interface ForkliftState {
  movement: MovementCommand;
  forkHeight: number;
  isConnected: boolean;
}

export default function App() {
  // State to track orientation
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  // Function to update orientation
  const updateOrientation = () => {
    const { width, height } = Dimensions.get('window');
    setIsPortrait(height > width);
  };

  // Set initial orientation and add listener for orientation changes
  useEffect(() => {
    updateOrientation();

    // Add event listener for orientation changes
    const subscription = Dimensions.addEventListener('change', updateOrientation);

    // Clean up
    return () => {
      subscription.remove();
    };
  }, []);

  // State for forklift controls
  const [forkliftState, setForkliftState] = useState<ForkliftState>({
    movement: { x: 0, y: 0 },
    forkHeight: 0,
    isConnected: false // Démarrer déconnecté
  });

  // Mode de test
  const [testMode, setTestMode] = useState<boolean>(false);

  // ESP32 connection settings
  const [ipAddress, setIpAddress] = useState<string>('192.168.4.1'); // Default ESP32 AP IP
  const [port, setPort] = useState<string>('81'); // Default WebSocket port

  // Set up event listeners for ESP32 service
  useEffect(() => {
    // Handle state changes from ESP32
    ESP32Service.onStateChange((state: ESP32State) => {
      if (!testMode) {
        setForkliftState(prev => ({
          ...prev,
          movement: state.movement,
          forkHeight: state.forkHeight
        }));
      }
    });

    // Handle connection changes
    ESP32Service.onConnectionChange((connected: boolean) => {
      if (!testMode) {
        setForkliftState(prev => ({
          ...prev,
          isConnected: connected
        }));

        if (connected) {
          Alert.alert('Connected', `Connected to ESP32 at ${ESP32Service.getIPAddress()}:${ESP32Service.getPort()}`);
        } else {
          Alert.alert('Disconnected', 'Lost connection to ESP32');
        }
      }
    });

    // Clean up on unmount
    return () => {
      if (forkliftState.isConnected && !testMode) {
        ESP32Service.disconnect();
      }
    };
  }, [testMode, forkliftState.isConnected]);

  // Function to connect to ESP32
  const connectToESP32 = async () => {
    try {
      if (testMode) {
        console.log('Entering test mode - simulating connection');
        // Simuler une connexion réussie en mode test
        setForkliftState(prev => ({
          ...prev,
          isConnected: true
        }));
      } else {
        console.log(`Connecting to ESP32 at ${ipAddress}:${port}`);
        await ESP32Service.connect(ipAddress, port);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      Alert.alert('Connection Failed', 'Could not connect to the ESP32. Please check the IP address and port.');
    }
  };

  // Function to disconnect and return to connection screen
  const disconnectAndReturn = () => {
    if (!testMode) {
      // Disconnect from ESP32 if in real mode
      ESP32Service.disconnect();
    }

    // Reset forklift state
    setForkliftState(prev => ({
      ...prev,
      isConnected: false
    }));

    console.log('Disconnected and returned to connection screen');
  };

  // Function to send movement commands to ESP32
  const sendMovementCommand = (x: number, y: number) => {
    if (!forkliftState.isConnected) {
      Alert.alert('Not Connected', 'Please connect to the ESP32 first or enable test mode');
      return;
    }

    // Assurons-nous que x et y sont des nombres valides
    const validX = isNaN(x) ? 0 : parseFloat(x.toFixed(2));
    const validY = isNaN(y) ? 0 : parseFloat(y.toFixed(2));

    const newMovement = { x: validX, y: validY };
    console.log('Movement command:', newMovement);

    // En mode test, on n'envoie pas réellement la commande à l'ESP32
    if (!testMode) {
      ESP32Service.sendMovementCommand(validX, validY);
    }

    // Update local state
    setForkliftState(prev => ({
      ...prev,
      movement: newMovement
    }));
  };

  // Function to control fork height
  const controlForkHeight = (direction: 'up' | 'down') => {
    if (!forkliftState.isConnected) {
      Alert.alert('Not Connected', 'Please connect to the ESP32 first or enable test mode');
      return;
    }

    const forkCommand: ForkCommand = direction === 'up' ? 1 : -1;
    console.log(`Fork command: ${direction}`);

    // En mode test, on n'envoie pas réellement la commande à l'ESP32
    if (!testMode) {
      ESP32Service.sendForkCommand(forkCommand);
    }

    // Mettre à jour la hauteur de la fourche
    setForkliftState(prev => ({
      ...prev,
      forkHeight: prev.forkHeight + forkCommand
    }));
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isPortrait && styles.containerPortrait]}>
        <StatusBar style="light" />

        {/* Header with connection status */}
        <View style={[styles.header, isPortrait && styles.headerPortrait]}>
          <View style={styles.titleContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('./assets/Mécalift22.png')}
                style={[styles.logo, isPortrait && styles.logoPortrait]}
                resizeMode="contain"
              />
              <View style={styles.titleTextContainer}>
                <Text style={[styles.headerTitle, isPortrait && styles.headerTitlePortrait]}>MécaLift</Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, isPortrait && styles.headerSubtitlePortrait]}>Forklift Controller</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, forkliftState.isConnected ? styles.statusConnected : styles.statusDisconnected]} />
            <Text style={styles.statusText}>
              {forkliftState.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        {/* Main content in landscape mode */}
        {!forkliftState.isConnected ? (
          // Connection screen - optimisé pour le mode paysage
          <View style={styles.connectionScreen}>
            <View style={[styles.connectionSettingsContainer, isPortrait && styles.connectionSettingsContainerPortrait]}>
              <View style={[styles.connectionFlexRow, isPortrait && styles.connectionFlexColumn]}>
                {/* Logo section */}
                <View style={[styles.connectionLogoSection, isPortrait && styles.connectionLogoSectionPortrait]}>
                  <Image
                    source={require('./assets/Mécalift22.png')}
                    style={[styles.connectionLogo, isPortrait && styles.connectionLogoPortrait]}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandTitle}>MécaLift</Text>
                </View>

                {/* Form section */}
                <View style={[styles.connectionFormSection, isPortrait && styles.connectionFormSectionPortrait]}>
                  <Text style={styles.connectionTitle}>Connect to ESP32</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>IP Address:</Text>
                    <TextInput
                      style={styles.input}
                      value={ipAddress}
                      onChangeText={setIpAddress}
                      placeholder="192.168.4.1"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Port:</Text>
                    <TextInput
                      style={styles.input}
                      value={port}
                      onChangeText={setPort}
                      placeholder="81"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={connectToESP32}
                  >
                    <Text style={styles.buttonText}>Connect</Text>
                  </TouchableOpacity>

                  {/* Test Mode Option */}
                  <View style={styles.testModeContainer}>
                    <TouchableOpacity
                      style={[styles.testModeButton, testMode && styles.testModeButtonActive]}
                      onPress={() => setTestMode(!testMode)}
                    >
                      <Icon name="bug" size={20} color={testMode ? "#fff" : "#3498db"} />
                      <Text style={[styles.testModeText, testMode && styles.testModeTextActive]}>
                        Test Mode {testMode ? "ON" : "OFF"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          // Control screen - landscape layout with title
          <View style={styles.controlsMainContainer}>
            <View style={[styles.controlsHeader, isPortrait && styles.controlsHeaderPortrait]}>
              <View style={styles.controlsHeaderContent}>
                <Text style={[styles.controlsHeaderTitle, isPortrait && styles.controlsHeaderTitlePortrait]}>Forklift Controller</Text>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={disconnectAndReturn}
                >
                  <Icon name="logout" size={20} color="#fff" />
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.controlsContainer, isPortrait && styles.controlsContainerPortrait]}>
              {isPortrait ? (
                // Portrait layout - Vertical stacking
                <>
                  {/* Status display */}
                  <View style={styles.commandsContainer}>
                    <Text style={styles.commandTitle}>Current Status</Text>
                    <View style={styles.commandRow}>
                      <Icon name="arrow-all" size={24} color="#3498db" />
                      <Text style={styles.commandText}>
                        X: {forkliftState.movement.x.toFixed(2)}, Y: {forkliftState.movement.y.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.commandRow}>
                      <Icon name="arrow-up-down" size={24} color="#3498db" />
                      <Text style={styles.commandText}>
                        Fork Height: {forkliftState.forkHeight}
                      </Text>
                    </View>
                  </View>

                  {/* Fork controls */}
                  <View style={styles.forkControlsContainer}>
                    <Text style={styles.sectionTitle}>Fork Controls</Text>
                    <View style={styles.forkButtonsContainer}>
                      <TouchableOpacity
                        style={styles.forkButton}
                        onPress={() => controlForkHeight('up')}
                      >
                        <Icon name="arrow-up-bold" size={50} color="#fff" />
                        <Text style={styles.buttonText}>UP</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.forkButton}
                        onPress={() => controlForkHeight('down')}
                      >
                        <Icon name="arrow-down-bold" size={50} color="#fff" />
                        <Text style={styles.buttonText}>DOWN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Joystick */}
                  <View style={styles.joystickContainer}>
                    <Text style={styles.sectionTitle}>Movement Controls</Text>
                    <View style={styles.joystickWrapper}>
                      <GestureHandlerRootView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <JoyStick
                          wrapperColor="#3498db"
                          nippleColor="#2980b9"
                          wrapperRadius={100}
                          nippleRadius={40}
                          borderWidth={3}
                          fingerCircleRadius={30}
                          onMove={(data: any) => {
                            console.log('Joystick data (portrait):', data);
                            // Assurons-nous que les données sont correctement extraites
                            const x = data && typeof data.x === 'number' ? data.x : 0;
                            const y = data && typeof data.y === 'number' ? data.y : 0;
                            sendMovementCommand(x, y);
                          }}
                          onTouchUp={() => sendMovementCommand(0, 0)}
                        />
                      </GestureHandlerRootView>
                    </View>
                  </View>
                </>
              ) : (
                // Landscape layout - Side by side
                <>
                  {/* Left side - Joystick */}
                  <View style={styles.leftPanel}>
                    <View style={styles.joystickContainer}>
                      <Text style={styles.sectionTitle}>Movement Controls</Text>
                      <View style={styles.joystickWrapper}>
                        <GestureHandlerRootView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <JoyStick
                            wrapperColor="#3498db"
                            nippleColor="#2980b9"
                            wrapperRadius={100}
                            nippleRadius={40}
                            borderWidth={3}
                            fingerCircleRadius={30}
                            onMove={(data: any) => {
                              console.log('Joystick data:', data);
                              // Assurons-nous que les données sont correctement extraites
                              const x = data && typeof data.x === 'number' ? data.x : 0;
                              const y = data && typeof data.y === 'number' ? data.y : 0;
                              sendMovementCommand(x, y);
                            }}
                            onTouchUp={() => sendMovementCommand(0, 0)}
                          />
                        </GestureHandlerRootView>
                      </View>
                    </View>
                  </View>

                  {/* Right side - Fork controls only */}
                  <View style={styles.rightPanel}>
                    {/* Fork height controls */}
                    <View style={styles.forkControlsContainer}>
                      <Text style={styles.sectionTitle}>Fork Controls</Text>
                      <View style={styles.forkButtonsContainer}>
                        <TouchableOpacity
                          style={styles.forkButton}
                          onPress={() => controlForkHeight('up')}
                        >
                          <Icon name="arrow-up-bold" size={60} color="#fff" />
                          <Text style={styles.buttonText}>UP</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.forkButton}
                          onPress={() => controlForkHeight('down')}
                        >
                          <Icon name="arrow-down-bold" size={60} color="#fff" />
                          <Text style={styles.buttonText}>DOWN</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
        {/* Footer with credits */}
        <View style={styles.footer}>
          <Text style={styles.creditText}>Created by:Hamza Tlili </Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
    padding: 10,
    paddingBottom: 30, // Ajout d'une marge en bas
  },
  containerPortrait: {
    paddingTop: 0, // Réduire le padding en haut en mode portrait
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#3498db',
    elevation: 5,
  },
  headerPortrait: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    marginTop: 50, // Déplacer l'en-tête encore plus vers le bas
    height: 60,
    minHeight: 60,
  },
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 3,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  logoPortrait: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 3,
  },
  titleTextContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  headerTitlePortrait: {
    fontSize: 24,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 3,
    letterSpacing: 0.5,
  },
  headerSubtitlePortrait: {
    fontSize: 16,
    marginLeft: 3,
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusConnected: {
    backgroundColor: '#2ecc71', // Green
  },
  statusDisconnected: {
    backgroundColor: '#e74c3c', // Red
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Connection screen
  connectionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionSettingsContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    padding: 15,
    borderRadius: 20,
    width: '70%',
    maxWidth: 700,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  connectionSettingsContainerPortrait: {
    width: '90%',
    padding: 20,
  },
  connectionFlexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 15,
    padding: 5,
  },
  connectionFlexColumn: {
    flexDirection: 'column',
  },
  connectionLogoSection: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 15,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#3498db',
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    borderRadius: 10,
    margin: 5,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  connectionLogoSectionPortrait: {
    flex: 0,
    paddingRight: 0,
    paddingBottom: 15,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#3498db',
    marginBottom: 15,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
  },
  connectionFormSection: {
    flex: 1.2,
    paddingLeft: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    borderRadius: 10,
    margin: 5,
  },
  connectionFormSectionPortrait: {
    flex: 0,
    paddingLeft: 0,
    width: '100%',
  },
  connectionLogoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  connectionLogo: {
    width: 120,
    height: 120,
    marginBottom: 10,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  connectionLogoPortrait: {
    width: 100,
    height: 100,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
    textAlign: 'center',
  },
  connectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  connectButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    elevation: 5,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  // Test mode styles
  testModeContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  testModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  testModeButtonActive: {
    backgroundColor: '#3498db',
  },
  testModeText: {
    color: '#3498db',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  testModeTextActive: {
    color: '#FFFFFF',
  },
  // Disconnect button styles
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    elevation: 3,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: 8,
    letterSpacing: 1,
  },

  // Control screen - landscape layout
  controlsMainContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  controlsHeader: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3498db',
    elevation: 5,
  },
  controlsHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlsHeaderPortrait: {
    padding: 8,
    marginBottom: 10,
    marginTop: 50, // Déplacer l'en-tête encore plus vers le bas
    height: 50,
  },
  controlsHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  controlsHeaderTitlePortrait: {
    fontSize: 20,
  },
  controlsContainer: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 20, // Ajout d'une marge en bas
  },
  controlsContainerPortrait: {
    flexDirection: 'column',
  },
  leftPanel: {
    flex: 1,
    marginRight: 10,
  },
  rightPanel: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
    minWidth: 300, // Largeur minimale pour assurer la visibilité
  },

  // Command display
  commandsContainer: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
  },
  commandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  commandText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
  },

  // Section titles
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },

  // Fork controls
  forkControlsContainer: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 15,
    elevation: 5,
    flex: 1,
    marginBottom: 10, // Ajout d'une marge en bas
    borderWidth: 1,
    borderColor: '#3498db',
  },
  forkButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 1,
    minHeight: 150, // Hauteur minimale augmentée pour assurer la visibilité
    alignItems: 'center',
  },
  forkButton: {
    backgroundColor: '#3498db',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    minHeight: 130, // Hauteur minimale augmentée pour assurer la visibilité
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#2980b9',
    marginHorizontal: 5,
  },

  // Joystick
  joystickContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    marginBottom: 10, // Ajout d'une marge en bas
    borderWidth: 1,
    borderColor: '#3498db',
  },
  joystickWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  creditText: {
    color: '#AAAAAA',
    fontSize: 8.5,
    fontStyle: 'italic',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});
