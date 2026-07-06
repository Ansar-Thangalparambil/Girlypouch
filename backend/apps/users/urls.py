from django.urls import path
from apps.users.views import UserRegisterView, UserLoginView, UserProfileView

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='user-register'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    path('me/', UserProfileView.as_view(), name='user-profile'),
]
