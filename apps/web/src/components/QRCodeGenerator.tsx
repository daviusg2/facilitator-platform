import { useState, useEffect } from "react";

interface QRCodeGeneratorProps {
  sessionId: string;
  sessionTitle: string;
  onClose: () => void;
}

export default function QRCodeGenerator({ sessionId, sessionTitle, onClose }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const participantUrl = `${window.location.origin}/join/${sessionId}`;

  useEffect(() => {
    console.log("🔍 QR Modal should be visible now!");
    
    const generateQR = async () => {
      setIsLoading(true);
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(participantUrl)}&format=png&margin=20`;
        setQrCodeUrl(qrUrl);
        console.log("✅ QR Code URL generated:", qrUrl);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [participantUrl]);

  const handleDownloadQR = () => {
    console.log("🔍 Download button clicked!");
    
    if (!qrCodeUrl) {
      alert("QR code not ready yet!");
      return;
    }
    
    // Simple download - just open in new tab
    window.open(qrCodeUrl, '_blank');
    alert('QR code opened in new tab. Right-click the image and select "Save image as..." to download it.');
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
        style={{
          backgroundColor: 'white',
          border: '3px solid red', // Temporary red border to make it obvious
          maxWidth: '28rem',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Big obvious header */}
        <div className="mb-6 text-center">
          <h1 
            className="text-2xl font-bold text-red-600"
            style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: 'red',
              marginBottom: '1rem'
            }}
          >
            🚨 QR MODAL IS HERE! 🚨
          </h1>
          <h2 className="text-xl font-bold text-gray-900">{sessionTitle}</h2>
          <button
            onClick={() => {
              console.log("🔍 Close button clicked!");
              onClose();
            }}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            style={{
              backgroundColor: 'red',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ❌ CLOSE MODAL
          </button>
        </div>

        {/* QR Code Display */}
        <div className="text-center mb-6">
          {isLoading ? (
            <div className="bg-yellow-200 p-8 text-center">
              <p className="text-lg">Loading QR Code...</p>
            </div>
          ) : (
            <div className="bg-blue-100 p-4 rounded-lg">
              <img 
                src={qrCodeUrl} 
                alt="Session QR Code" 
                className="w-[200px] h-[200px] mx-auto"
                style={{
                  width: '200px',
                  height: '200px',
                  border: '2px solid blue'
                }}
                onLoad={() => {
                  console.log("✅ QR code image loaded successfully");
                }}
              />
            </div>
          )}
        </div>

        {/* Big obvious download button */}
        <div className="text-center">
          <button
            onClick={handleDownloadQR}
            className="bg-green-500 text-white px-8 py-4 text-xl rounded-lg hover:bg-green-600"
            style={{
              backgroundColor: 'green',
              color: 'white',
              padding: '1rem 2rem',
              fontSize: '1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            📥 DOWNLOAD QR CODE
          </button>
        </div>

        {/* Participant URL */}
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="text-sm font-mono break-all">{participantUrl}</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(participantUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch (error) {
                console.error("Copy failed:", error);
              }
            }}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
          >
            {copied ? '✅ Copied!' : '📋 Copy Link'}
          </button>
        </div>

        {/* Debug info */}
        <div className="mt-4 p-2 bg-gray-200 rounded text-xs">
          <strong>Debug:</strong><br/>
          QR URL: {qrCodeUrl ? 'Generated' : 'Not ready'}<br/>
          Loading: {isLoading ? 'Yes' : 'No'}
        </div>
      </div>
    </div>
  );
}