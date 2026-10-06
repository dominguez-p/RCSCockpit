package main

import (
    "context"
    "errors"
    "flag"
    "fmt"
    "log"
    "mime"
    "net"
    "net/http"
    "os"
    "os/exec"
    "os/signal"
    "path/filepath"
    "runtime"
    "strings"
    "syscall"
    "time"
)

const (
    firstPort = 5500
    lastPort  = 5510
)

func main() {
    rootArg := flag.String("root", "", "Carpeta raíz del Cockpit")
    flag.Parse()

    root, err := resolveRoot(*rootArg)
    if err != nil {
        fatalPause(err)
    }

    indexPath := filepath.Join(root, "index.html")
    if info, err := os.Stat(indexPath); err != nil || info.IsDir() {
        fatalPause(fmt.Errorf("no se encuentra index.html en %s", root))
    }

    listener, port, err := listenLocal(firstPort, lastPort)
    if err != nil {
        fatalPause(err)
    }
    defer listener.Close()

    handler := newCockpitHandler(root)
    server := &http.Server{
        Handler:           handler,
        ReadHeaderTimeout: 10 * time.Second,
    }

    url := fmt.Sprintf("http://127.0.0.1:%d/", port)

    fmt.Println()
    fmt.Println("============================================================")
    fmt.Println(" RCS Cockpit - versión portable")
    fmt.Println("============================================================")
    fmt.Println()
    fmt.Printf(" Carpeta: %s\n", root)
    fmt.Printf(" URL:     %s\n", url)
    fmt.Println()
    fmt.Println(" El navegador se abrirá automáticamente.")
    fmt.Println(" Mantén esta ventana abierta mientras uses el Cockpit.")
    fmt.Println(" Pulsa Ctrl+C o cierra esta ventana para detenerlo.")
    fmt.Println()

    go func() {
        time.Sleep(350 * time.Millisecond)
        if err := openBrowser(url); err != nil {
            log.Printf("No se ha podido abrir el navegador automáticamente: %v", err)
            log.Printf("Abre manualmente: %s", url)
        }
    }()

    stop := make(chan os.Signal, 1)
    signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

    go func() {
        <-stop
        ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
        defer cancel()
        _ = server.Shutdown(ctx)
    }()

    err = server.Serve(listener)
    if err != nil && !errors.Is(err, http.ErrServerClosed) {
        fatalPause(fmt.Errorf("error en el servidor local: %w", err))
    }
}

func resolveRoot(rootArg string) (string, error) {
    root := strings.TrimSpace(rootArg)
    if root == "" {
        executable, err := os.Executable()
        if err != nil {
            return "", fmt.Errorf("no se puede localizar el ejecutable: %w", err)
        }
        root = filepath.Dir(filepath.Dir(executable))
    }

    absolute, err := filepath.Abs(root)
    if err != nil {
        return "", fmt.Errorf("no se puede resolver la carpeta del Cockpit: %w", err)
    }

    return filepath.Clean(absolute), nil
}

func listenLocal(first, last int) (net.Listener, int, error) {
    for port := first; port <= last; port++ {
        address := fmt.Sprintf("127.0.0.1:%d", port)
        listener, err := net.Listen("tcp", address)
        if err == nil {
            return listener, port, nil
        }
    }

    return nil, 0, fmt.Errorf(
        "no hay un puerto disponible entre %d y %d; cierra otra instancia del Cockpit y vuelve a intentarlo",
        first,
        last,
    )
}

func newCockpitHandler(root string) http.Handler {
    fileServer := http.FileServer(http.Dir(root))

    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        path := r.URL.Path

        cleanPath := filepath.ToSlash(filepath.Clean(path))
        lowerPath := strings.ToLower(cleanPath)

        if strings.HasPrefix(lowerPath, "/.runtime/") ||
            lowerPath == "/.runtime" ||
            strings.HasPrefix(lowerPath, "/.git/") ||
            lowerPath == "/.git" {
            http.NotFound(w, r)
            return
        }

        if ext := strings.ToLower(filepath.Ext(cleanPath)); ext != "" {
            if contentType := mime.TypeByExtension(ext); contentType != "" {
                w.Header().Set("Content-Type", contentType)
            }
        }

        w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
        w.Header().Set("Pragma", "no-cache")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

        fileServer.ServeHTTP(w, r)
    })
}

func openBrowser(url string) error {
    var command *exec.Cmd

    switch runtime.GOOS {
    case "darwin":
        command = exec.Command("open", url)
    case "windows":
        command = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
    default:
        command = exec.Command("xdg-open", url)
    }

    return command.Start()
}

func fatalPause(err error) {
    fmt.Println()
    fmt.Println("RCS Cockpit no ha podido iniciarse.")
    fmt.Println()
    fmt.Printf("%v\n", err)
    fmt.Println()
    os.Exit(1)
}
