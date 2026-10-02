#include <iostream>
using namespace std;

// Base class
class Animal {
public:
    virtual void makeSound() {
        cout << "Animal sound" << endl;
    }
};

// Derived class demonstrating Inheritance and Polymorphism
class Dog : public Animal {
public:
    void makeSound() override {
        cout << "Woof! Woof!" << endl;
    }
};

int main() {
    Animal* myDog = new Dog();
    myDog->makeSound(); // Polymorphic call
    delete myDog;
    return 0;
}
