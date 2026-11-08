<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Clean Lightweight HTTP Router
 */
class Router
{
    private array $routes = [];

    public function get(string $path, callable|array $handler): void
    {
        $this->addRoute('GET', $path, $handler);
    }

    public function post(string $path, callable|array $handler): void
    {
        $this->addRoute('POST', $path, $handler);
    }

    public function put(string $path, callable|array $handler): void
    {
        $this->addRoute('PUT', $path, $handler);
    }

    public function delete(string $path, callable|array $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }

    public function any(string $path, callable|array $handler): void
    {
        foreach (['GET', 'POST', 'PUT', 'DELETE'] as $method) {
            $this->addRoute($method, $path, $handler);
        }
    }

    private function addRoute(string $method, string $path, callable|array $handler): void
    {
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $path);
        $pattern = '#^' . $pattern . '$#';

        $this->routes[] = [
            'method'  => $method,
            'pattern' => $pattern,
            'handler' => $handler
        ];
    }

    public function dispatch(Request $request): void
    {
        $method = $request->method();
        // Support method spoofing for HTML forms (_method=PUT / _method=DELETE)
        if ($method === 'POST' && $request->input('_method')) {
            $method = strtoupper((string)$request->input('_method'));
        }

        $path = $request->path();

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['pattern'], $path, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $handler = $route['handler'];

                if (is_array($handler)) {
                    [$class, $action] = $handler;
                    $controller = new $class();
                    $controller->$action($request, ...array_values($params));
                    return;
                }

                $handler($request, ...array_values($params));
                return;
            }
        }

        // Fallback: 404 Not Found
        if ($request->isJson()) {
            Response::json(['error' => 'Endpoint Not Found', 'path' => $path], 404);
        } else {
            Response::redirect('/');
        }
    }
}
