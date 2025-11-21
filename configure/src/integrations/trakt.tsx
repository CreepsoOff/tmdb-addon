import { useState, useEffect, useCallback } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Trakt() {
  const { traktAccessToken, traktRefreshToken, setTraktAccessToken, setTraktRefreshToken, catalogs, setCatalogs } = useConfig();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAccessToken = useCallback(async (code: string) => {
    setIsLoading(true);
    setError("");
    try {
      if (!code || code.trim() === '') {
        throw new Error('Invalid authorization code');
      }
      
      const response = await fetch(`/trakt_access_token?code=${encodeURIComponent(code)}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to obtain access token';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const tokenData = await response.json();
      
      // Check if the response is a JSON with an error
      if (tokenData.error || tokenData.success === false) {
        throw new Error(tokenData.error || tokenData.status_message || 'Failed to obtain access token');
      }
      
      // Validate that the access token is not empty
      if (!tokenData.access_token || tokenData.access_token.trim() === '') {
        throw new Error('Received empty access token');
      }
      
      setTraktAccessToken(tokenData.access_token);
      if (tokenData.refresh_token) {
        setTraktRefreshToken(tokenData.refresh_token);
      }

      // Add Trakt catalogs if they don't already exist
      const traktCatalogsToAdd = [
        {
          id: "trakt.watchlist",
          type: "movie",
          name: "Trakt Watchlist",
          enabled: true,
          showInHome: true
        },
        {
          id: "trakt.watchlist",
          type: "series",
          name: "Trakt Watchlist",
          enabled: true,
          showInHome: true
        },
        {
          id: "trakt.recommendations",
          type: "movie",
          name: "Trakt Recommendations",
          enabled: true,
          showInHome: true
        },
        {
          id: "trakt.recommendations",
          type: "series",
          name: "Trakt Recommendations",
          enabled: true,
          showInHome: true
        }
      ];

      setCatalogs((prev) => {
        const existingIds = new Set(prev.map((c) => `${c.id}-${c.type}`));
        const newCatalogs = traktCatalogsToAdd.filter(
          (c) => !existingIds.has(`${c.id}-${c.type}`)
        );
        
        // If they already exist, just set enabled/showInHome to true
        const updatedCatalogs = prev.map((c) => {
          const traktCatalog = traktCatalogsToAdd.find(
            (tc) => tc.id === c.id && tc.type === c.type
          );
          if (traktCatalog) {
            return { ...c, enabled: true, showInHome: true };
          }
          return c;
        });
        
        return [...updatedCatalogs, ...newCatalogs];
      });

      toast({
        title: "Trakt account connected",
        description: "Your watchlist and recommendations have been synced.",
      });
      
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to connect Trakt account");
    } finally {
      setIsLoading(false);
    }
  }, [setTraktAccessToken, setTraktRefreshToken, setCatalogs]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      handleAccessToken(code);
    }
  }, [handleAccessToken]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/trakt_auth_url`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to obtain authentication URL';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Validate that the URL is not empty
      if (!data.authUrl || data.authUrl.trim() === '') {
        throw new Error('Received empty authentication URL');
      }

      // Redirect to the Trakt authentication page
      window.location.href = data.authUrl;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to start Trakt authentication");
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setTraktAccessToken("");
    setTraktRefreshToken("");
    
    // Remove Trakt catalogs
    setCatalogs((prev) => prev.filter((c) => !c.id.startsWith("trakt.")));

    toast({
      title: "Trakt account disconnected",
      description: "Your Trakt account has been disconnected successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {traktAccessToken ? (
          <div className="flex flex-col items-center space-y-4">
            <Alert>
                <AlertDescription>
                You are connected to Trakt
              </AlertDescription>
            </Alert>
            <DialogClose asChild>
              <Button variant="destructive" onClick={handleLogout}>
                Disconnect
              </Button>
            </DialogClose>
          </div>
        ) : (
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting to Trakt...
              </>
            ) : (
              'Connect with Trakt'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

