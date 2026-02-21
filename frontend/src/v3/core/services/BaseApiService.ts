import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Get API base URL from config or environment
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v3';

/**
 * Base API Service for V3 Architecture.
 * Provides a unified way to handle requests, responses, and errors.
 */
class BaseApiService {
    protected api: AxiosInstance;

    constructor(resourcePath: string) {
        this.api = axios.create({
            baseURL: `${BASE_URL}${resourcePath}`,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor for adding Auth Token
        this.api.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor for standardized error handling
        this.api.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error) => {
                const message = error.response?.data?.message || 'Something went wrong';
                // TODO: Integrate with global toast/notification system
                console.error('API Error:', message);
                return Promise.reject(error);
            }
        );
    }

    protected async get<T>(url: string = '', config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.get<T>(url, config);
        return response.data;
    }

    protected async post<T>(url: string = '', data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.post<T>(url, data, config);
        return response.data;
    }

    protected async put<T>(url: string = '', data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.put<T>(url, data, config);
        return response.data;
    }

    protected async delete<T>(url: string = '', config?: AxiosRequestConfig): Promise<T> {
        const response = await this.api.delete<T>(url, config);
        return response.data;
    }
}

export default BaseApiService;
