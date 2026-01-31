from rest_framework import permissions


class IsAdminUserCustom(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff


class IsVendedor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.nivel_acesso == 'vendedor'


class IsFinanceiro(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.nivel_acesso == 'financeiro'
